import { NextResponse } from 'next/server';
import { RegisterSchema } from '@/lib/validations';
import { getUsersCollection } from '@/lib/db';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';
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

    const existingUser = await usersCol.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const newUser: User = {
      _id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: email.toLowerCase().trim(),
      name,
      role,
      phone,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    await usersCol.insertOne(newUser);

    const safeUser: Omit<User, 'passwordHash'> = {
      _id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      phone: newUser.phone,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    const token = createSessionToken({
      _id: newUser._id,
      email: newUser.email,
      role: newUser.role,
    });

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
