import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership } from '@/lib/auth';
import { 
  getMedicationsCollection, 
  getDoseEventsCollection, 
  SEED_IDS 
} from '@/lib/db';
import { ScheduleItem, DoseStatus, Medication, DoseEvent } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId') || SEED_IDS.PROFILE_MEERA;
    
    // Target date in YYYY-MM-DD format (defaults to current date)
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (user && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied to this care profile' }, { status: 403 });
      }
    }

    const medicationsCol = await getMedicationsCollection();
    // Fetch active medications for this profile
    const medications: Medication[] = await medicationsCol.find({
      careProfileId,
      status: 'active',
    }).toArray();

    // Query doseEvents for this profile
    const doseEventsCol = await getDoseEventsCollection();
    const existingDoseEvents: DoseEvent[] = await doseEventsCol.find({
      careProfileId,
    }).toArray();

    // Create a lookup map of existing dose events by doseKey
    const doseEventMap = new Map<string, DoseEvent>();
    existingDoseEvents.forEach((de) => {
      if (de.doseKey) {
        doseEventMap.set(de.doseKey, de);
      }
    });

    const scheduleItems: ScheduleItem[] = [];

    // Construct schedule items for targetDate
    for (const med of medications) {
      // Check if med is within active start/end date range
      if (med.startDate && med.startDate > targetDate) continue;
      if (med.endDate && med.endDate < targetDate) continue;

      const times = med.scheduledTimes || ['09:00'];

      for (const time of times) {
        const doseKey = `${careProfileId}_${med._id}_${targetDate}_${time}`;
        const scheduledAt = `${targetDate}T${time}:00.000Z`;
        const existingEvent = doseEventMap.get(doseKey);

        let status: DoseStatus = 'scheduled';
        let doseEventId: string | undefined = undefined;
        let administeredBy: string | undefined = undefined;
        let administeredByName: string | undefined = undefined;
        let recordedAt: string | undefined = undefined;

        if (existingEvent) {
          status = existingEvent.status;
          doseEventId = existingEvent._id;
          administeredBy = existingEvent.administeredBy;
          administeredByName = existingEvent.administeredByName;
          recordedAt = existingEvent.recordedAt;
        }

        scheduleItems.push({
          doseKey,
          medicationId: med._id,
          medicineName: med.medicineName,
          medicineCategory: med.medicineCategory,
          dosage: med.dosage,
          instructions: med.instructions,
          scheduledTime: time,
          scheduledAt,
          mealRelation: med.mealRelation,
          pillColor: med.pillColor,
          pillShape: med.pillShape,
          status,
          doseEventId,
          administeredBy,
          administeredByName,
          recordedAt,
          remainingQuantity: med.remainingQuantity ?? 0,
        });
      }
    }

    // Sort items by scheduledTime ascending
    scheduleItems.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    // Calculate adherence statistics
    const total = scheduleItems.length;
    const taken = scheduleItems.filter((i) => i.status === 'taken').length;
    const missed = scheduleItems.filter((i) => i.status === 'missed').length;
    const scheduled = scheduleItems.filter((i) => i.status === 'scheduled').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    return NextResponse.json({
      date: targetDate,
      items: scheduleItems,
      summary: {
        total,
        taken,
        missed,
        scheduled,
        adherenceRate,
      },
    });
  } catch (err: any) {
    console.error('[API Doses Today] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
