import { NextResponse } from 'next/server';
import { authenticateRequest, canApproveMedication } from '@/lib/auth';
import { 
  getMedicationsCollection, 
  getNotificationsCollection, 
  logAudit 
} from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { id } = await context.params;
    const medicationsCol = await getMedicationsCollection();
    const existing = await medicationsCol.findOne({ _id: id });

    if (!existing) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // IDOR Protection: Must belong to user's household
    if (existing.householdId && existing.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this medication' }, { status: 403 });
    }

    // CareCircle Rule: Only Elder (SENIOR) or Household OWNER can approve/reject
    if (!canApproveMedication(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only the elder or authorized owner can approve or reject medication prescriptions' },
        { status: 403 }
      );
    }

    // Caregiver cannot approve their own submission
    const isCaregiver = ['CAREGIVER', 'PRIMARY_CAREGIVER'].includes((auth.role || '').toUpperCase());
    if (isCaregiver || existing.submittedBy === auth.user._id) {
      if ((auth.role || '').toUpperCase() !== 'OWNER' && (auth.role || '').toUpperCase() !== 'SENIOR') {
        return NextResponse.json(
          { error: 'Forbidden: Caregivers cannot approve their own medication submissions' },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'approve';
    const reason = body.reason || '';

    const now = new Date().toISOString();
    const notifsCol = await getNotificationsCollection();

    if (action === 'approve') {
      await medicationsCol.updateOne(
        { _id: id },
        {
          $set: {
            status: 'active',
            approvedBy: auth.user._id,
            approvedByName: auth.user.name,
            approvedAt: now,
            updatedAt: now,
          },
        }
      );

      await logAudit({
        householdId: auth.householdId,
        careProfileId: existing.careProfileId,
        actorId: auth.user._id,
        actorName: auth.user.name,
        actorRole: auth.role || 'SENIOR',
        action: 'APPROVE_MEDICATION',
        entityType: 'medication',
        entityId: id,
        details: {
          medicineName: existing.medicineName,
          dosage: existing.dosage,
          submittedBy: existing.submittedByName || existing.submittedBy,
        },
      });

      await notifsCol.insertOne({
        _id: `notif_${Date.now()}_appr_success`,
        householdId: auth.householdId,
        careProfileId: existing.careProfileId,
        title: `Medication Approved: ${existing.medicineName}`,
        message: `${auth.user.name} approved ${existing.medicineName} (${existing.dosage}). Scheduled doses are now active.`,
        type: 'general',
        priority: 'medium',
        status: 'unread',
        deliveryStatus: 'in_app',
        sentViaEmail: false,
        createdAt: now,
      });

      const updated = await medicationsCol.findOne({ _id: id });
      return NextResponse.json({ success: true, action: 'approved', medication: updated });
    } else if (action === 'reject') {
      await medicationsCol.updateOne(
        { _id: id },
        {
          $set: {
            status: 'rejected',
            rejectionReason: reason || 'Declined by elder',
            updatedAt: now,
          },
        }
      );

      await logAudit({
        householdId: auth.householdId,
        careProfileId: existing.careProfileId,
        actorId: auth.user._id,
        actorName: auth.user.name,
        actorRole: auth.role || 'SENIOR',
        action: 'REJECT_MEDICATION',
        entityType: 'medication',
        entityId: id,
        details: {
          medicineName: existing.medicineName,
          reason,
        },
      });

      await notifsCol.insertOne({
        _id: `notif_${Date.now()}_appr_reject`,
        householdId: auth.householdId,
        careProfileId: existing.careProfileId,
        title: `Medication Declined: ${existing.medicineName}`,
        message: `${auth.user.name} declined ${existing.medicineName}. Reason: ${reason || 'Not specified'}.`,
        type: 'general',
        priority: 'high',
        status: 'unread',
        deliveryStatus: 'in_app',
        sentViaEmail: false,
        createdAt: now,
      });

      const updated = await medicationsCol.findOne({ _id: id });
      return NextResponse.json({ success: true, action: 'rejected', medication: updated });
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[API Medication Approval] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
