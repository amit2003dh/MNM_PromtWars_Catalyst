import { NextResponse } from 'next/server';
import { authenticateRequest, canWriteCaregiverNotes } from '@/lib/auth';
import { getCaregiverNotesCollection, getCareProfilesCollection, logAudit } from '@/lib/db';
import { CaregiverNoteCreateSchema } from '@/lib/validations';
import { CaregiverNote } from '@/types';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId');
    const shiftDate = searchParams.get('shiftDate');

    const query: Record<string, any> = { householdId: auth.householdId };
    
    if (careProfileId) {
      const profilesCol = await getCareProfilesCollection();
      const profile = await profilesCol.findOne({ _id: careProfileId, householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
      query.careProfileId = careProfileId;
    }

    if (shiftDate) query.shiftDate = shiftDate;

    const notesCol = await getCaregiverNotesCollection();
    const notes = await notesCol.find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ notes });
  } catch (err: any) {
    console.error('[API CaregiverNotes GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.user || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized: Authentication required' }, { status: auth.statusCode || 401 });
    }

    const json = await request.json();
    const result = CaregiverNoteCreateSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify care profile belongs to household
    const profilesCol = await getCareProfilesCollection();
    let profile = await profilesCol.findOne({ _id: data.careProfileId, householdId: auth.householdId });
    if (!profile) {
      profile = await profilesCol.findOne({ householdId: auth.householdId });
      if (profile) {
        data.careProfileId = profile._id;
      } else {
        return NextResponse.json({ error: 'Forbidden: Invalid care profile for this household' }, { status: 403 });
      }
    }

    if (!canWriteCaregiverNotes(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only caregivers, coordinators, and owners can write shift handoff notes' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const noteId = `cn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newNote: CaregiverNote = {
      _id: noteId,
      householdId: auth.householdId,
      careProfileId: data.careProfileId,
      authorId: auth.user._id,
      authorName: auth.user.name,
      authorRole: auth.role || 'CAREGIVER',
      shiftDate: data.shiftDate || now.split('T')[0],
      noteContent: data.noteContent,
      createdAt: now,
    };

    const notesCol = await getCaregiverNotesCollection();
    await notesCol.insertOne(newNote);

    await logAudit({
      householdId: auth.householdId,
      careProfileId: data.careProfileId,
      actorId: auth.user._id,
      actorName: auth.user.name,
      actorRole: auth.role || 'CAREGIVER',
      action: 'ADD_CAREGIVER_NOTE',
      entityType: 'caregiverNote',
      entityId: noteId,
      details: { shiftDate: newNote.shiftDate },
    });

    return NextResponse.json({ success: true, note: newNote }, { status: 201 });
  } catch (err: any) {
    console.error('[API CaregiverNotes POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
