import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { RegisterSchema } from '@/lib/validations';
import { 
  getUsersCollection, 
  getHouseholdsCollection, 
  getMembershipsCollection, 
  getCareProfilesCollection, 
  getCareMembershipsCollection 
} from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createDBSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { User } from '@/types';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = RegisterSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, role, phone } = result.data;
    const usersCol = await getUsersCollection();

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await usersCol.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const newUserId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const newUser: User = {
      _id: newUserId,
      email: cleanEmail,
      name,
      role,
      phone,
      passwordHash,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    };

    await usersCol.insertOne(newUser as any);

    // Provision isolated household, membership, and initial care profile
    const memCol = await getMembershipsCollection();
    const hhCol = await getHouseholdsCollection();
    const profilesCol = await getCareProfilesCollection();
    const careMemCol = await getCareMembershipsCollection();

    const householdId = `hh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const householdName = `${name}'s Family Care`;

    await hhCol.insertOne({
      _id: householdId,
      name: householdName,
      ownerId: newUser._id,
      createdAt: now,
      updatedAt: now,
    });

    await memCol.insertOne({
      _id: `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId: newUser._id,
      householdId,
      role: 'OWNER',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      userName: name,
      userEmail: cleanEmail,
    });

    const initialProfileId = `cp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const uniqueInviteCode = `CARE-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    await profilesCol.insertOne({
      _id: initialProfileId,
      householdId,
      fullName: `${name}'s Family Care Recipient`,
      preferredName: 'Senior',
      age: 70,
      gender: 'Other',
      inviteCode: uniqueInviteCode,
      emergencyContacts: [
        { name, relationship: 'Primary Family Contact', phone: phone || '', isPrimary: true }
      ],
      allergies: [],
      chronicConditions: [],
      notes: 'Initial care profile automatically created. Customize in Settings or Care Circle.',
      createdAt: now,
      updatedAt: now,
    });

    await careMemCol.insertOne({
      _id: `cm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      householdId,
      careProfileId: initialProfileId,
      userId: newUser._id,
      role: role === 'senior' ? 'senior' : 'primary_caregiver',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      userName: name,
      userEmail: cleanEmail,
    });

    await usersCol.updateOne(
      { _id: newUser._id },
      { $set: { activeHouseholdId: householdId } }
    );

    const safeUser: Omit<User, 'passwordHash'> = {
      _id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      phone: newUser.phone,
      activeHouseholdId: householdId,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    const token = await createDBSession(newUser._id, householdId);

    const response = NextResponse.json(
      { success: true, user: safeUser, token },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('[API Auth Register] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', message: err?.message },
      { status: 500 }
    );
  }
}
