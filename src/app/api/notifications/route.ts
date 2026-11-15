import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership } from '@/lib/auth';
import { getNotificationsCollection, SEED_IDS } from '@/lib/db';
import { z } from 'zod';

const PatchNotificationSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['unread', 'read', 'dismissed']),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId') || SEED_IDS.PROFILE_MEERA;
    const status = searchParams.get('status');

    if (user && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
    }

    const query: Record<string, any> = { careProfileId };
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const result = PatchNotificationSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const { id, status } = result.data;
    const notifsCol = await getNotificationsCollection();
    await notifsCol.updateOne({ _id: id }, { $set: { status } });

    return NextResponse.json({ success: true, id, status });
  } catch (err: any) {
    console.error('[API Notifications PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
