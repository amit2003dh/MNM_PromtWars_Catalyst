import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership } from '@/lib/auth';
import { getDoseEventsCollection, getMedicationsCollection, SEED_IDS } from '@/lib/db';
import { DoseEvent, Medication } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId') || SEED_IDS.PROFILE_MEERA;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const medicationId = searchParams.get('medicationId');

    if (user && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
    }

    const query: Record<string, any> = { careProfileId };
    if (medicationId) query.medicationId = medicationId;
    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = `${startDate}T00:00:00.000Z`;
      if (endDate) query.scheduledAt.$lte = `${endDate}T23:59:59.999Z`;
    }

    const doseEventsCol = await getDoseEventsCollection();
    const doseEvents: DoseEvent[] = await doseEventsCol.find(query).sort({ scheduledAt: -1 }).toArray();

    const medicationsCol = await getMedicationsCollection();
    const meds: Medication[] = await medicationsCol.find({ careProfileId }).toArray();
    const medMap = new Map<string, string>();
    meds.forEach((m) => medMap.set(m._id, m.medicineName));

    const enrichedHistory = doseEvents.map((de) => ({
      ...de,
      medicineName: medMap.get(de.medicationId) || 'Medication',
    }));

    const total = enrichedHistory.length;
    const taken = enrichedHistory.filter((de) => de.status === 'taken').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    return NextResponse.json({
      history: enrichedHistory,
      adherenceRate,
      total,
      taken,
    });
  } catch (err: any) {
    console.error('[API Doses History] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
