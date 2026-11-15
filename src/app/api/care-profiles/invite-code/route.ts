import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership, generateInviteCode, hashPasscode } from '@/lib/auth';
import { getCareProfilesCollection, logAudit, SEED_IDS } from '@/lib/db';
import { z } from 'zod';

const RequestSchema = z.object({
  careProfileId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const result = RequestSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const { careProfileId } = result.data;
    const { isMember, role } = await verifyMembership(user._id, careProfileId);

    if (!isMember && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Only caregivers and family can generate or view invite codes
    if (role === 'senior' && user.role === 'senior') {
      return NextResponse.json({ error: 'Seniors cannot regenerate circle passcodes' }, { status: 403 });
    }

    const profilesCol = await getCareProfilesCollection();
    const newCode = generateInviteCode('NEST');
    const newHash = await hashPasscode(newCode);

    await profilesCol.updateOne(
      { _id: careProfileId },
      { $set: { inviteCode: newCode, inviteCodeHash: newHash, updatedAt: new Date().toISOString() } }
    );

    await logAudit({
      careProfileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: role || user.role || 'caregiver',
      action: 'REGENERATE_INVITE_CODE',
      entityType: 'careProfile',
      entityId: careProfileId,
      details: { newCode },
    });

    return NextResponse.json({ success: true, inviteCode: newCode });
  } catch (err: any) {
    console.error('[API CareProfiles InviteCode] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
