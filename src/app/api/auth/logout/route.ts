import { NextResponse } from 'next/server';
import { extractToken, destroyDBSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const token = await extractToken(request);
    if (token) {
      await destroyDBSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err: any) {
    console.error('[API auth/logout] Error:', err);
    return NextResponse.json(
      { error: 'Failed to complete logout' },
      { status: 500 }
    );
  }
}
