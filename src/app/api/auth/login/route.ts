import { NextResponse } from 'next/server';
import { LoginSchema } from '@/lib/validations';
import { getUsersCollection, getCareMembershipsCollection } from '@/lib/db';
import { comparePassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';
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
    const user = await usersCol.findOne({ email: email.toLowerCase().trim() });

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

    const membershipsCol = await getCareMembershipsCollection();
    const memberships = await membershipsCol.find({
      userId: user._id,
      status: 'active',
    }).toArray();

    const safeUser: Omit<User, 'passwordHash'> = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const token = createSessionToken({
      _id: user._id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      memberships,
      token,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
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
