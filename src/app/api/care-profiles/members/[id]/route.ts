import { NextResponse } from 'next/server';
import { authenticateRequest, canManageCareCircleMembers } from '@/lib/auth';
import { 
  getMembershipsCollection, 
  getCareMembershipsCollection, 
  getHouseholdsCollection,
  logAudit 
} from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    // Only Elder (SENIOR) or Household OWNER can remove members
    if (!canManageCareCircleMembers(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only the elder or household owner can remove care circle members' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const careMemCol = await getCareMembershipsCollection();
    const memCol = await getMembershipsCollection();
    const hhCol = await getHouseholdsCollection();

    // Check if membership belongs to this household
    const careMem = await careMemCol.findOne({ _id: id });
    const hhMem = await memCol.findOne({ _id: id });
    const targetMember = careMem || hhMem;

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const targetHouseholdId = targetMember.householdId || auth.householdId;
    if (targetHouseholdId !== auth.householdId) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this care circle' }, { status: 403 });
    }

    // Cannot remove household owner
    const household = await hhCol.findOne({ _id: auth.householdId });
    if (household && household.ownerId === targetMember.userId) {
      return NextResponse.json({ error: 'Forbidden: Cannot remove the household owner' }, { status: 400 });
    }

    // Revoke both careProfile membership and household membership
    if (careMem) {
      await careMemCol.updateOne({ _id: id }, { $set: { status: 'revoked', updatedAt: new Date().toISOString() } });
    }
    if (hhMem) {
      await memCol.updateOne({ _id: id }, { $set: { status: 'revoked', updatedAt: new Date().toISOString() } });
    }
    await memCol.updateMany(
      { userId: targetMember.userId, householdId: auth.householdId },
      { $set: { status: 'revoked' } }
    );

    await logAudit({
      householdId: auth.householdId,
      careProfileId: (careMem?.careProfileId as string) || 'profile_default',
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
      action: 'REMOVE_CARE_CIRCLE_MEMBER',
      entityType: 'careMembership',
      entityId: id,
      details: {
        removedUserId: targetMember.userId,
        removedUserName: targetMember.userName,
        removedRole: targetMember.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Member ${targetMember.userName || targetMember.userId} removed from Care Circle`,
    });
  } catch (err: any) {
    console.error('[API CareProfiles Member Delete] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
