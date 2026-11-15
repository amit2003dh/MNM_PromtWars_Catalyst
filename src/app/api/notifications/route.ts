import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getNotificationsCollection, getCareProfilesCollection } from '@/lib/db';
import { z } from 'zod';

const PatchNotificationSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['unread', 'read', 'dismissed']),
});

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId');
    const status = searchParams.get('status');

    const query: Record<string, any> = { householdId: auth.householdId };
    
    if (careProfileId) {
      const profilesCol = await getCareProfilesCollection();
      const profile = await profilesCol.findOne({ _id: careProfileId, householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
      query.careProfileId = careProfileId;
    }

    if (status) query.status = status;

    const notifsCol = await getNotificationsCollection();
    const notifications = await notifsCol.find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ notifications });
  } catch (err: any) {
    console.error('[API Notifications GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const json = await request.json();
    const result = PatchNotificationSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const { id, status } = result.data;
    const notifsCol = await getNotificationsCollection();
    
    const existing = await notifsCol.findOne({ _id: id });
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // IDOR Protection: Verify household
    if (existing.householdId && existing.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    await notifsCol.updateOne({ _id: id }, { $set: { status } });

    return NextResponse.json({ success: true, id, status });
  } catch (err: any) {
    console.error('[API Notifications PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
