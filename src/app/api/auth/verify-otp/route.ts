import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { verifyGmailOTP } from '@/lib/email/gmail-otp';
import { 
  getUsersCollection, 
  getHouseholdsCollection, 
  getMembershipsCollection, 
  getCareProfilesCollection, 
  getCareMembershipsCollection 
} from '@/lib/db';
import { createDBSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';

const VerifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  otp: z.string().length(6, 'Verification code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must contain digits only'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = VerifyOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid verification code format' },
        { status: 400 }
      );
    }

    const { email, otp } = result.data;

    // 1. Verify OTP with attempts limit & expiration
    const verification = await verifyGmailOTP(email, otp);
    if (!verification.valid) {
      const statusCode = verification.locked ? 429 : 400;
      return NextResponse.json(
        { 
          error: verification.message, 
          attemptsRemaining: verification.attemptsRemaining,
          locked: verification.locked,
        },
        { status: statusCode }
      );
    }

    // 2. Find or Auto-Create User in MongoDB
    const usersCol = await getUsersCollection();
    let user = await usersCol.findOne({ email });
    const nowIso = new Date().toISOString();

    if (!user) {
      const displayName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const newUserId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      const newUser = {
        _id: newUserId,
        email,
        name: displayName,
        role: 'owner',
        emailVerified: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await usersCol.insertOne(newUser as any);
      user = newUser as any;
      console.log(`[Auth] Auto-provisioned new User record for: ${email}`);
    } else if (!user.emailVerified) {
      await usersCol.updateOne({ _id: user._id }, { $set: { emailVerified: true, updatedAt: nowIso } });
    }

    // 3. Resolve or Auto-Create Household & Membership
    const memCol = await getMembershipsCollection();
    const hhCol = await getHouseholdsCollection();
    const profilesCol = await getCareProfilesCollection();
    const careMemCol = await getCareMembershipsCollection();

    let activeMembership = await memCol.findOne({ userId: user!._id, status: 'active' });
    let householdId: string;
    let householdName = '';

    if (!activeMembership) {
      // Create independent household for this user
      householdId = `hh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      householdName = `${user!.name}'s Family Care`;

      await hhCol.insertOne({
        _id: householdId,
        name: householdName,
        ownerId: user!._id,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // Assign OWNER membership
      await memCol.insertOne({
        _id: `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        userId: user!._id,
        householdId,
        role: 'OWNER',
        status: 'active',
        joinedAt: nowIso,
        createdAt: nowIso,
        userName: user!.name,
        userEmail: user!.email,
      });

      // Create initial Care Recipient Profile for this household
      const initialProfileId = `cp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const uniqueInviteCode = `CARE-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      await profilesCol.insertOne({
        _id: initialProfileId,
        householdId,
        fullName: `${user!.name}'s Family Care Recipient`,
        preferredName: 'Senior',
        age: 70,
        gender: 'Other',
        inviteCode: uniqueInviteCode,
        emergencyContacts: [
          { name: user!.name, relationship: 'Primary Family Contact', phone: user!.phone || '', isPrimary: true }
        ],
        allergies: [],
        chronicConditions: [],
        notes: 'Initial care profile automatically created. Customize in Settings or Care Circle.',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      await careMemCol.insertOne({
        _id: `cm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        householdId,
        careProfileId: initialProfileId,
        userId: user!._id,
        role: 'primary_caregiver',
        status: 'active',
        joinedAt: nowIso,
        createdAt: nowIso,
        userName: user!.name,
        userEmail: user!.email,
      });

      console.log(`[Auth] Created independent Household "${householdName}" (${householdId}) for user ${user!.email}`);
    } else {
      householdId = activeMembership.householdId;
      const existingHh = await hhCol.findOne({ _id: householdId });
      householdName = existingHh?.name || `${user!.name}'s Family Care`;
    }

    // Update user's active household pointer
    await usersCol.updateOne(
      { _id: user!._id },
      { $set: { activeHouseholdId: householdId, updatedAt: nowIso } }
    );

    // 4. Create secure server-side session in MongoDB
    const sessionToken = await createDBSession(user!._id, householdId);

    // 5. Construct response with secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token: sessionToken,
      user: {
        _id: user!._id,
        email: user!.email,
        name: user!.name,
        role: activeMembership?.role || 'OWNER',
        activeHouseholdId: householdId,
      },
      household: {
        _id: householdId,
        name: householdName,
      },
      membership: {
        role: activeMembership?.role || 'OWNER',
        householdId,
      },
      householdId,
    });

    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: any) {
    console.error('[API verify-otp] Error:', err);
    return NextResponse.json(
      { error: 'Verification failed due to an internal error. Please try again.' },
      { status: 500 }
    );
  }
}
