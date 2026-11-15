import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership, canWriteCaregiverNotes } from '@/lib/auth';
import { getCaregiverNotesCollection, logAudit, SEED_IDS } from '@/lib/db';
import { CaregiverNoteCreateSchema } from '@/lib/validations';
import { CaregiverNote } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId') || SEED_IDS.PROFILE_MEERA;
    const shiftDate = searchParams.get('shiftDate');

    if (user && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
    }

    const query: Record<string, any> = { careProfileId };
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
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
    const { isMember, role } = await verifyMembership(user._id, data.careProfileId);

    if (data.careProfileId !== SEED_IDS.PROFILE_MEERA && !isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this care circle' }, { status: 403 });
    }

    const effectiveRole = role || user.role;
    if (!canWriteCaregiverNotes(effectiveRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only primary caregivers and caregivers can write shift handoff notes' },
        { status: 403 }
      );
    }

    const now = new Date();
    const shiftDate = data.shiftDate || now.toISOString().split('T')[0];
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newNote: CaregiverNote = {
      _id: noteId,
      careProfileId: data.careProfileId,
      authorId: user._id,
      authorName: user.name,
      authorRole: effectiveRole,
      shiftDate,
      noteContent: data.noteContent,
      createdAt: now.toISOString(),
    };

    const notesCol = await getCaregiverNotesCollection();
    await notesCol.insertOne(newNote);

    await logAudit({
      careProfileId: data.careProfileId,
      actorId: user._id,
      actorName: user.name,
      actorRole: effectiveRole,
      action: 'CREATE_CAREGIVER_NOTE',
      entityType: 'caregiverNote',
      entityId: noteId,
      details: { shiftDate },
    });

    return NextResponse.json({ success: true, note: newNote }, { status: 201 });
  } catch (err: any) {
    console.error('[API CaregiverNotes POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
