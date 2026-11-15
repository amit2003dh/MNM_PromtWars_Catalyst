import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'Unauthorized: No active session' },
        { status: 401 }
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
