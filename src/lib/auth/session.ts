import { cookies } from 'next/headers';
import { User, CareMembership, CareProfile, AuthSession } from '@/types';
import { getUsersCollection, getCareMembershipsCollection, getCareProfilesCollection, SEED_IDS } from '@/lib/db';

const SESSION_COOKIE_NAME = 'carenest_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Creates an encrypted / base64 session token.
 */
export function createSessionToken(user: { _id: string; email: string; role: string }): string {
  const payload: SessionPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decodes and validates session token.
 */
export function decodeSessionToken(token: string): SessionPayload | null {
  try {
    const jsonStr = Buffer.from(token, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionPayload;
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Resolves current user from request cookies or headers.
 * Supports:
 * 1. carenest_session cookie
 * 2. Authorization: Bearer <token_or_userId>
 * 3. x-user-id: <userId>
 * 4. Fallback to Sunita (primary caregiver) or Meera if x-demo-role header is provided
 */
export async function getCurrentUser(request?: Request): Promise<User | null> {
  let userId: string | null = null;

  // 1. Check request headers first if request is passed
  if (request) {
    const headerUserId = request.headers.get('x-user-id');
    if (headerUserId) {
      userId = headerUserId;
    } else {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        // Check if token is a direct userId (e.g. user_sunita_02) or encoded token
        if (token.startsWith('user_')) {
          userId = token;
        } else {
          const payload = decodeSessionToken(token);
          if (payload) userId = payload.userId;
        }
      }
    }
  }

  // 2. Check cookies
  if (!userId) {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
      if (sessionCookie?.value) {
        const token = sessionCookie.value;
        if (token.startsWith('user_')) {
          userId = token;
        } else {
          const payload = decodeSessionToken(token);
          if (payload) userId = payload.userId;
        }
      }
    } catch {
      // cookies() might fail if not in a request context
    }
  }

  // 3. Optional fallback for role switcher in UI if x-role or query param is set
  if (!userId && request) {
    const demoRole = request.headers.get('x-demo-role');
    if (demoRole === 'senior') userId = SEED_IDS.USER_MEERA;
    else if (demoRole === 'family') userId = SEED_IDS.USER_RAHUL;
    else if (demoRole === 'caregiver') userId = SEED_IDS.USER_SUNITA;
  }

  // If still no user, fallback to primary caregiver Sunita for local test / development convenience
  if (!userId) {
    userId = SEED_IDS.USER_SUNITA;
  }

  try {
    const usersCol = await getUsersCollection();
    let user = await usersCol.findOne({ _id: userId });
    if (!user) {
      // Also try finding by email if userId looks like email
      user = await usersCol.findOne({ email: userId });
    }
    return user || null;
  } catch (err) {
    console.error('[Auth] Error fetching current user:', err);
    return null;
  }
}

/**
 * Resolves full auth session including user, memberships, and active Care Profile.
 */
export async function getSession(request?: Request): Promise<AuthSession | null> {
  const user = await getCurrentUser(request);
  if (!user) return null;

  try {
    const membershipsCol = await getCareMembershipsCollection();
    const memberships = await membershipsCol.find({
      userId: user._id,
      status: 'active',
    }).toArray();

    const profilesCol = await getCareProfilesCollection();
    let activeProfile: CareProfile | null = null;

    if (memberships.length > 0) {
      activeProfile = await profilesCol.findOne({ _id: memberships[0].careProfileId });
    }

    if (!activeProfile) {
      // Default fallback to Meera Sharma profile
      activeProfile = await profilesCol.findOne({ _id: SEED_IDS.PROFILE_MEERA });
    }

    // Strip passwordHash before returning to client
    const safeUser: User = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: safeUser,
      memberships,
      activeProfile: activeProfile || undefined,
    };
  } catch (err) {
    console.error('[Auth] Error building session:', err);
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
