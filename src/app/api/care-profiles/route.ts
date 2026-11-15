import { NextResponse } from 'next/server';
import { authenticateRequest, generateInviteCode, hashPasscode } from '@/lib/auth';
import { 
  getCareProfilesCollection, 
  getCareMembershipsCollection, 
  logAudit 
} from '@/lib/db';
import { CareProfileCreateSchema } from '@/lib/validations';
import { CareProfile, CareMembership } from '@/types';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const profilesCol = await getCareProfilesCollection();
    const membershipsCol = await getCareMembershipsCollection();

    if (id) {
      const profile = await profilesCol.findOne({ _id: id, householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Care profile not found or access denied' }, { status: 404 });
      }

      const members = await membershipsCol.find({ careProfileId: id, status: 'active' }).toArray();
      return NextResponse.json({ profile, members });
    }

    // List profiles strictly belonging to this user's household
    const profiles = await profilesCol.find({ householdId: auth.householdId }).toArray();
    return NextResponse.json({ profiles });
  } catch (err: any) {
    console.error('[API CareProfiles GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
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
    const inviteCode = generateInviteCode(data.fullName);
    const inviteCodeHash = await hashPasscode(inviteCode);

    const newProfile: CareProfile = {
      _id: profileId,
      householdId: auth.householdId,
      fullName: data.fullName,
      preferredName: data.preferredName,
      age: data.age,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      emergencyContacts: data.emergencyContacts || [],
      allergies: data.allergies || [],
      chronicConditions: data.chronicConditions || [],
      dietaryRestrictions: data.dietaryRestrictions || [],
      notes: data.notes,
      inviteCode,
      inviteCodeHash,
      createdAt: now,
      updatedAt: now,
    };

    const profilesCol = await getCareProfilesCollection();
    await profilesCol.insertOne(newProfile);

    // Auto-create active membership for creator
    const membershipsCol = await getCareMembershipsCollection();
    const newMembership: CareMembership = {
      _id: `membership_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      householdId: auth.householdId,
      careProfileId: profileId,
      userId: auth.user._id,
      role: 'primary_caregiver',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      userName: auth.user.name,
      userEmail: auth.user.email,
    };
    await membershipsCol.insertOne(newMembership);

    await logAudit({
      householdId: auth.householdId,
      careProfileId: profileId,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: 'CREATE_CARE_PROFILE',
      entityType: 'careProfile',
      entityId: profileId,
      details: { fullName: data.fullName, inviteCode },
    });

    return NextResponse.json(
      {
        success: true,
        profile: newProfile,
        membership: newMembership,
        inviteCode,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API CareProfiles POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
