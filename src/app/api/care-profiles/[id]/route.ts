import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getCareProfilesCollection, getCareMembershipsCollection, logAudit } from '@/lib/db';
import { CareProfileUpdateSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { id } = await context.params;
    const profilesCol = await getCareProfilesCollection();
    const profile = await profilesCol.findOne({ _id: id });

    if (!profile) {
      return NextResponse.json({ error: 'Care profile not found' }, { status: 404 });
    }

    // Strict multi-tenant IDOR check
    if (profile.householdId && profile.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this care circle' }, { status: 403 });
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
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { id } = await context.params;
    const profilesCol = await getCareProfilesCollection();
    const existing = await profilesCol.findOne({ _id: id });

    if (!existing) {
      return NextResponse.json({ error: 'Care profile not found' }, { status: 404 });
    }

    // IDOR Protection: verify household
    if (existing.householdId && existing.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this care circle' }, { status: 403 });
    }

    const json = await request.json();
    const result = CareProfileUpdateSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      ...result.data,
      updatedAt: now,
    };

    await profilesCol.updateOne({ _id: id }, { $set: updates });
    const updated = await profilesCol.findOne({ _id: id });

    await logAudit({
      householdId: auth.householdId,
      careProfileId: id,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'OWNER',
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
