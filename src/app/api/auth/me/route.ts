import { NextResponse } from 'next/server';
import { getSession, extractToken } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const token = await extractToken(request);
    const session = await getSession(request);

    if (!session) {
      // If a token was provided but is invalid or expired, return 401
      if (token) {
        return NextResponse.json(
          { authenticated: false, error: 'Unauthorized: Session invalid or expired' },
          { status: 401 }
        );
      }
      // If no token was provided, it is a normal unauthenticated visitor - return 200 without console error
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      household: session.household,
      householdId: session.householdId,
      role: session.role || 'OWNER',
      memberships: session.memberships,
      activeProfile: session.activeProfile,
    });
  } catch (err: any) {
    console.error('[API auth/me] Error:', err);
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
