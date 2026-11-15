import { NextResponse } from 'next/server';
import { getCurrentUser, comparePasscode } from '@/lib/auth';
import { getCareProfilesCollection, getCareMembershipsCollection, logAudit } from '@/lib/db';
import { JoinCareCircleSchema } from '@/lib/validations';
import { CareProfile, CareMembership } from '@/types';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to join a care circle' }, { status: 401 });
    }

    const json = await request.json();
    const result = JoinCareCircleSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { inviteCode, role } = result.data;
    const normalizedInputCode = inviteCode.trim().toUpperCase();

    const profilesCol = await getCareProfilesCollection();
    const allProfiles = await profilesCol.find({}).toArray();

    let matchedProfile: CareProfile | null = null;

    for (const p of allProfiles) {
      if (p.inviteCode && p.inviteCode.trim().toUpperCase() === normalizedInputCode) {
        matchedProfile = p;
        break;
      }
      if (p.inviteCodeHash) {
        const isMatch = await comparePasscode(normalizedInputCode, p.inviteCodeHash);
        if (isMatch) {
          matchedProfile = p;
          break;
        }
      }
    }

    if (!matchedProfile) {
      return NextResponse.json(
        { error: 'Invalid invite passcode. Please check the code with your primary caregiver or family member.' },
        { status: 404 }
      );
    }

    const membershipsCol = await getCareMembershipsCollection();
    const existingMembership = await membershipsCol.findOne({
      careProfileId: matchedProfile._id,
      userId: user._id,
      status: 'active',
    });

    if (existingMembership) {
      return NextResponse.json({
        success: true,
        message: 'You are already an active member of this care circle',
        profile: matchedProfile,
        membership: existingMembership,
      });
    }

    const now = new Date().toISOString();
    const assignedRole = role || (user.role === 'caregiver' ? 'caregiver' : user.role);

    const newMembership: CareMembership = {
      _id: `membership_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      careProfileId: matchedProfile._id,
      userId: user._id,
      role: assignedRole as any,
      status: 'active',
      userName: user.name,
      userEmail: user.email,
      joinedAt: now,
      createdAt: now,
    };

    await membershipsCol.insertOne(newMembership);

    await logAudit({
      careProfileId: matchedProfile._id,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'JOIN_CARE_CIRCLE',
      entityType: 'careMembership',
      entityId: newMembership._id,
      details: { role: assignedRole },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${matchedProfile.fullName}'s Care Circle!`,
      profile: matchedProfile,
      membership: newMembership,
    }, { status: 200 });
  } catch (err: any) {
    console.error('[API CareProfiles Join] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
