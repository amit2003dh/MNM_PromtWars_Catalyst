import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership } from '@/lib/auth';
import { getCareProfilesCollection, getCareMembershipsCollection, logAudit, SEED_IDS } from '@/lib/db';
import { CareProfileUpdateSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(request);

    const profilesCol = await getCareProfilesCollection();
    const profile = await profilesCol.findOne({ _id: id });

    if (!profile) {
      return NextResponse.json({ error: 'Care profile not found' }, { status: 404 });
    }

    if (user && id !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, id);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied to this care circle' }, { status: 403 });
      }
    }

    const membershipsCol = await getCareMembershipsCollection();
    const members = await membershipsCol.find({ careProfileId: id, status: 'active' }).toArray();

    return NextResponse.json({ profile, members });
  } catch (err: any) {
    console.error('[API CareProfile GET by ID] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isMember, role } = await verifyMembership(user._id, id);
    if (!isMember && id !== SEED_IDS.PROFILE_MEERA) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this care circle' }, { status: 403 });
    }

    const json = await request.json();
    const result = CareProfileUpdateSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const profilesCol = await getCareProfilesCollection();
    const existing = await profilesCol.findOne({ _id: id });
    if (!existing) {
      return NextResponse.json({ error: 'Care profile not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      ...result.data,
      updatedAt: now,
    };

    await profilesCol.updateOne({ _id: id }, { $set: updates });
    const updated = await profilesCol.findOne({ _id: id });

    await logAudit({
      careProfileId: id,
      actorId: user._id,
      actorName: user.name,
      actorRole: role || user.role,
      action: 'UPDATE_CARE_PROFILE',
      entityType: 'careProfile',
      entityId: id,
      details: result.data,
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (err: any) {
    console.error('[API CareProfile PUT] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
