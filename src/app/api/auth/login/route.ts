import { NextResponse } from 'next/server';
import { LoginSchema } from '@/lib/validations';
import { getUsersCollection, getCareMembershipsCollection, getMembershipsCollection, SEED_IDS } from '@/lib/db';
import { comparePassword, createDBSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';
import { User } from '@/types';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = LoginSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const usersCol = await getUsersCollection();
    const cleanEmail = email.toLowerCase().trim();
    let user = await usersCol.findOne({ email: cleanEmail });

    // Support demo aliases
    if (!user) {
      const demoEmailMap: Record<string, string> = {
        'meera.sharma@example.com': 'meera@carenest.local',
        'sunita.care@example.com': 'sunita@carenest.local',
        'rahul.sharma@example.com': 'rahul@carenest.local',
        'meera@example.com': 'meera@carenest.local',
        'sunita@example.com': 'sunita@carenest.local',
        'rahul@example.com': 'rahul@carenest.local',
      };
      const alias = demoEmailMap[cleanEmail];
      if (alias) {
        user = await usersCol.findOne({ email: alias });
      }
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const memCol = await getMembershipsCollection();
    const activeMembership = await memCol.findOne({ userId: user._id, status: 'active' });
    const householdId = activeMembership?.householdId || user.activeHouseholdId || (user as any).householdId || SEED_IDS.HOUSEHOLD_DEMO_MEERA;

    // Create server-side session token in MongoDB sessions collection
    const token = await createDBSession(user._id, householdId);

    const membershipsCol = await getCareMembershipsCollection();
    const memberships = await membershipsCol.find({
      userId: user._id,
      status: 'active',
    }).toArray();

    const safeUser: Omit<User, 'passwordHash'> = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: activeMembership?.role || user.role,
      phone: user.phone,
      activeHouseholdId: householdId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      householdId,
      memberships,
      token,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: any) {
    console.error('[API Auth Login] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', message: err?.message },
      { status: 500 }
    );
  }
}
