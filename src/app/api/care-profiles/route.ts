import { NextResponse } from 'next/server';
import { getCurrentUser, generateInviteCode, hashPasscode } from '@/lib/auth';
import { 
  getCareProfilesCollection, 
  getCareMembershipsCollection, 
  logAudit, 
  SEED_IDS 
} from '@/lib/db';
import { CareProfileCreateSchema } from '@/lib/validations';
import { CareProfile, CareMembership } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const profilesCol = await getCareProfilesCollection();
    const membershipsCol = await getCareMembershipsCollection();

    if (id) {
      const profile = await profilesCol.findOne({ _id: id });
      if (!profile) {
        return NextResponse.json({ error: 'Care profile not found' }, { status: 404 });
      }

      // Check membership if user is authenticated
      if (user) {
        const membership = await membershipsCol.findOne({
          careProfileId: id,
          userId: user._id,
          status: 'active',
        });
        if (!membership && id !== SEED_IDS.PROFILE_MEERA) {
          return NextResponse.json({ error: 'Forbidden: You do not have access to this care circle' }, { status: 403 });
        }
      }

      const members = await membershipsCol.find({ careProfileId: id, status: 'active' }).toArray();
      return NextResponse.json({ profile, members });
    }

    // List profiles for the user
    if (!user) {
      // In unauthenticated context, provide default Meera Sharma demo profile
      const defaultProfile = await profilesCol.findOne({ _id: SEED_IDS.PROFILE_MEERA });
      return NextResponse.json({ profiles: defaultProfile ? [defaultProfile] : [] });
    }

    const userMemberships = await membershipsCol.find({
      userId: user._id,
      status: 'active',
    }).toArray();

    const profileIds = userMemberships.map((m: CareMembership) => m.careProfileId);
    let profiles: CareProfile[] = [];

    if (profileIds.length > 0) {
      profiles = await profilesCol.find({ _id: { $in: profileIds } }).toArray();
    }

    // Fallback: If user has no memberships yet, include default Meera profile for testing
    if (profiles.length === 0) {
      const defaultProfile = await profilesCol.findOne({ _id: SEED_IDS.PROFILE_MEERA });
      if (defaultProfile) profiles.push(defaultProfile);
    }

    return NextResponse.json({ profiles });
  } catch (err: any) {
    console.error('[API CareProfiles GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const json = await request.json();
    const result = CareProfileCreateSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;
    const now = new Date().toISOString();
    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Generate secure invite code
    const rawInviteCode = generateInviteCode('NEST');
    const inviteCodeHash = await hashPasscode(rawInviteCode);

    const newProfile: CareProfile = {
      _id: profileId,
      fullName: data.fullName,
      preferredName: data.preferredName,
      age: data.age,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      emergencyContacts: data.emergencyContacts,
      allergies: data.allergies,
      chronicConditions: data.chronicConditions,
      dietaryRestrictions: data.dietaryRestrictions || [],
      notes: data.notes,
      inviteCode: rawInviteCode,
      inviteCodeHash,
      createdAt: now,
      updatedAt: now,
    };

    const profilesCol = await getCareProfilesCollection();
    await profilesCol.insertOne(newProfile);

    // Create care membership for creator
    const membershipsCol = await getCareMembershipsCollection();
    const memberRole = user.role === 'caregiver' ? 'primary_caregiver' : user.role;
    const newMembership: CareMembership = {
      _id: `membership_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      careProfileId: profileId,
      userId: user._id,
      role: memberRole as any,
      status: 'active',
      userName: user.name,
      userEmail: user.email,
      joinedAt: now,
      createdAt: now,
    };

    await membershipsCol.insertOne(newMembership);

    await logAudit({
      careProfileId: profileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'CREATE_CARE_PROFILE',
      entityType: 'careProfile',
      entityId: profileId,
      details: { fullName: data.fullName, inviteCode: rawInviteCode },
    });

    return NextResponse.json(
      { success: true, profile: newProfile, membership: newMembership },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API CareProfiles POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
