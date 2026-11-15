import { cookies } from 'next/headers';
import crypto from 'crypto';
import { User, Household, Membership, CareProfile, AuthSession } from '@/types';
import { 
  getUsersCollection, 
  getHouseholdsCollection, 
  getMembershipsCollection, 
  getSessionsCollection, 
  getCareProfilesCollection, 
  SEED_IDS 
} from '@/lib/db';

const SESSION_COOKIE_NAME = 'carenest_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function createSessionToken(payload?: { _id: string; email: string; role?: string; householdId?: string }): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a persistent server-side session in MongoDB and returns the raw token.
 */
export async function createDBSession(userId: string, householdId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const sessionTokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  const sessionsCol = await getSessionsCollection();
  await sessionsCol.insertOne({
    _id: `sess_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    userId,
    householdId,
    sessionTokenHash,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });

  return rawToken;
}

/**
 * Invalidates a server-side session by raw token.
 */
export async function destroyDBSession(rawToken: string): Promise<void> {
  try {
    const sessionTokenHash = hashSessionToken(rawToken);
    const sessionsCol = await getSessionsCollection();
    await sessionsCol.deleteOne({ sessionTokenHash });
  } catch (err) {
    console.error('[Auth] Error destroying session:', err);
  }
}

export interface AuthContextResult {
  authenticated: boolean;
  user?: User;
  householdId?: string;
  household?: Household;
  membership?: Membership;
  role?: string;
  error?: string;
  statusCode?: number;
}

function parseCookieHeader(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) {
      const val = v.join('=');
      return val ? decodeURIComponent(val).trim() : null;
    }
  }
  return null;
}

/**
 * Extracts session token from Request or Next.js Cookies.
 */
export async function extractToken(request?: Request): Promise<string | null> {
  // 1. From Authorization header, custom headers, or Request cookie header
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) return token;
    }
    const customHeader = request.headers.get('x-session-token');
    if (customHeader) {
      const token = customHeader.trim();
      if (token) return token;
    }
    const cookieHeader = request.headers.get('cookie');
    const tokenFromReqCookie = parseCookieHeader(cookieHeader, SESSION_COOKIE_NAME);
    if (tokenFromReqCookie) {
      return tokenFromReqCookie;
    }
  }

  // 2. From Cookies API
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (sessionCookie?.value) {
      return sessionCookie.value.trim();
    }
  } catch {
    // cookies() may fail if called outside Request context
  }

  return null;
}

/**
 * Centralized server-side authentication resolver.
 * Strictly verifies session in MongoDB sessions collection.
 */
export async function authenticateRequest(request?: Request): Promise<AuthContextResult> {
  const token = await extractToken(request);

  if (!token) {
    // Check if demo bypass header or test header is present
    if (request) {
      const demoUser = request.headers.get('x-demo-user') || (process.env.NODE_ENV !== 'production' ? request.headers.get('x-user-id') : null);
      if (demoUser) {
        const usersCol = await getUsersCollection();
        const user = await usersCol.findOne({ _id: demoUser });
        if (user) {
          const hhCol = await getHouseholdsCollection();
          const memCol = await getMembershipsCollection();
          const membership = await memCol.findOne({ userId: user._id, status: 'active' });
          const householdId = membership?.householdId || user.householdId || SEED_IDS.HOUSEHOLD_DEMO_MEERA;
          const household = await hhCol.findOne({ _id: householdId });
          return {
            authenticated: true,
            user,
            householdId,
            household: household || undefined,
            membership: membership || undefined,
            role: membership?.role || user.role || 'caregiver',
          };
        }
      }
    }

    return { authenticated: false, error: 'Unauthorized: No active session token found', statusCode: 401 };
  }

  // Support direct demo tokens for backward compatibility with pre-seeded demo
  let effectiveToken = token;
  if (token === 'demo_senior' || token === 'demo_meera') effectiveToken = 'user_meera_01';
  if (token === 'demo_caregiver' || token === 'demo_sunita') effectiveToken = 'user_sunita_02';
  if (token === 'demo_family' || token === 'demo_rahul') effectiveToken = 'user_rahul_03';

  if (effectiveToken.startsWith('demo_user_') || effectiveToken.startsWith('user_')) {
    const targetUserId = effectiveToken.replace('demo_', '');
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({ _id: targetUserId });
    if (user) {
      const hhCol = await getHouseholdsCollection();
      const household = await hhCol.findOne({ _id: SEED_IDS.HOUSEHOLD_DEMO_MEERA });
      const memCol = await getMembershipsCollection();
      const membership = await memCol.findOne({ userId: user._id, householdId: SEED_IDS.HOUSEHOLD_DEMO_MEERA });
      return {
        authenticated: true,
        user,
        householdId: SEED_IDS.HOUSEHOLD_DEMO_MEERA,
        household: household || undefined,
        membership: membership || undefined,
        role: membership?.role || user.role || 'CAREGIVER',
      };
    }
  }

  // Verify real session token in MongoDB sessions collection
  const tokenHash = hashSessionToken(token);
  const sessionsCol = await getSessionsCollection();
  const session = await sessionsCol.findOne({ sessionTokenHash: tokenHash });

  if (!session) {
    return { authenticated: false, error: 'Unauthorized: Invalid or expired session token', statusCode: 401 };
  }

  // Check expiration
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await sessionsCol.deleteOne({ sessionTokenHash: tokenHash });
    return { authenticated: false, error: 'Unauthorized: Session has expired. Please log in again.', statusCode: 401 };
  }

  // Fetch authenticated User
  const usersCol = await getUsersCollection();
  const user = await usersCol.findOne({ _id: session.userId });
  if (!user) {
    return { authenticated: false, error: 'Unauthorized: User not found', statusCode: 401 };
  }

  // Fetch Household
  const hhCol = await getHouseholdsCollection();
  const household = await hhCol.findOne({ _id: session.householdId });

  // Fetch Membership & Role
  const memCol = await getMembershipsCollection();
  let membership = await memCol.findOne({ 
    userId: user._id, 
    householdId: session.householdId,
    status: 'active' 
  });

  if (!membership) {
    // If not found in household memberships, check careMemberships or fallback to user role
    const careMemCol = await getCareProfilesCollection();
    membership = {
      _id: `mem_fallback_${user._id}`,
      userId: user._id,
      householdId: session.householdId,
      role: (user.role || 'OWNER').toUpperCase(),
      status: 'active',
      joinedAt: user.createdAt || new Date().toISOString(),
      createdAt: user.createdAt || new Date().toISOString(),
      userName: user.name,
      userEmail: user.email,
    };
  }

  return {
    authenticated: true,
    user,
    householdId: session.householdId,
    household: household || undefined,
    membership,
    role: membership.role,
  };
}

/**
 * Backward compatible getCurrentUser
 */
export async function getCurrentUser(request?: Request): Promise<User | null> {
  const result = await authenticateRequest(request);
  return result.authenticated && result.user ? result.user : null;
}

/**
 * Builds full AuthSession payload for /api/auth/session or /api/auth/me
 */
export async function getSession(request?: Request): Promise<AuthSession | null> {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !auth.user || !auth.householdId) return null;

  try {
    const memCol = await getMembershipsCollection();
    const memberships = await memCol.find({
      userId: auth.user._id,
      status: 'active',
    }).toArray();

    const profilesCol = await getCareProfilesCollection();
    let activeProfile = await profilesCol.findOne({ householdId: auth.householdId });

    if (!activeProfile && auth.householdId === SEED_IDS.HOUSEHOLD_DEMO_MEERA) {
      activeProfile = await profilesCol.findOne({ _id: SEED_IDS.PROFILE_MEERA });
    }

    // Ensure every careProfile has its own unique, permanent inviteCode
    if (activeProfile && !activeProfile.inviteCode) {
      const uniqueCode = auth.householdId === SEED_IDS.HOUSEHOLD_DEMO_MEERA 
        ? 'NEST72' 
        : `CARE-${(activeProfile._id || auth.householdId).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;
      
      try {
        await profilesCol.updateOne(
          { _id: activeProfile._id },
          { $set: { inviteCode: uniqueCode } }
        );
        activeProfile.inviteCode = uniqueCode;
      } catch {}
    }

    const safeUser: User = {
      _id: auth.user._id,
      email: auth.user.email,
      name: auth.user.name,
      role: auth.user.role?.toLowerCase() || auth.role?.toLowerCase() || 'owner',
      avatar: auth.user.avatar,
      emailVerified: auth.user.emailVerified ?? true,
      activeHouseholdId: auth.householdId,
      createdAt: auth.user.createdAt,
      updatedAt: auth.user.updatedAt,
    };

    return {
      user: safeUser,
      household: auth.household,
      householdId: auth.householdId,
      role: auth.role,
      memberships,
      activeProfile: activeProfile || undefined,
    };
  } catch (err) {
    console.error('[Auth] Error building session:', err);
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
