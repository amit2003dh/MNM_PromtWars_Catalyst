import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { 
  getMedicationsCollection, 
  getDoseEventsCollection, 
  getCareProfilesCollection,
  SEED_IDS 
} from '@/lib/db';
import { ScheduleItem, DoseStatus, Medication, DoseEvent } from '@/types';

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.householdId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 401 });
    }

    const { searchParams } = new URL(request.url);
    let careProfileId = searchParams.get('careProfileId');
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const profilesCol = await getCareProfilesCollection();

    if (careProfileId) {
      const profile = await profilesCol.findOne({ _id: careProfileId, householdId: auth.householdId });
      if (!profile) {
        return NextResponse.json({ error: 'Forbidden: Access denied to this care profile' }, { status: 403 });
      }
    } else {
      const profile = await profilesCol.findOne({ householdId: auth.householdId });
      if (profile) {
        careProfileId = profile._id;
      } else if (auth.householdId === SEED_IDS.HOUSEHOLD_DEMO_MEERA) {
        careProfileId = SEED_IDS.PROFILE_MEERA;
      } else {
        return NextResponse.json({ schedule: [], adherenceScore: 100, completedCount: 0, totalCount: 0 });
      }
    }

    const medicationsCol = await getMedicationsCollection();
    // Fetch active medications strictly scoped by householdId and profile
    const medications: Medication[] = await medicationsCol.find({
      householdId: auth.householdId,
      careProfileId,
      status: 'active',
    }).toArray();

    // Query doseEvents for this profile
    const doseEventsCol = await getDoseEventsCollection();
    const existingDoseEvents: DoseEvent[] = await doseEventsCol.find({
      householdId: auth.householdId,
      careProfileId,
    }).toArray();

    const doseEventMap = new Map<string, DoseEvent>();
    existingDoseEvents.forEach((de) => {
      if (de.doseKey) {
        doseEventMap.set(de.doseKey, de);
      }
    });

    const scheduleItems: ScheduleItem[] = [];

    for (const med of medications) {
      if (med.startDate && med.startDate > targetDate) continue;
      if (med.endDate && med.endDate < targetDate) continue;

      const times = med.scheduledTimes || ['09:00'];

      for (const time of times) {
        const doseKey = `${careProfileId}_${med._id}_${targetDate}_${time}`;
        const scheduledAt = `${targetDate}T${time}:00.000Z`;
        const existingEvent = doseEventMap.get(doseKey);

        let status: DoseStatus = 'scheduled';
        if (existingEvent) {
          status = existingEvent.status;
        } else {
          // If scheduled time has passed by more than 60 minutes and not marked, consider missed
          const scheduledTimeMs = new Date(scheduledAt).getTime();
          const nowMs = Date.now();
          if (nowMs > scheduledTimeMs + 60 * 60 * 1000) {
            status = 'missed';
          }
        }

        scheduleItems.push({
          doseKey,
          householdId: auth.householdId,
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
          doseEventId: existingEvent?._id,
          administeredBy: existingEvent?.administeredBy,
          administeredByName: existingEvent?.administeredByName,
          recordedAt: existingEvent?.recordedAt,
          remainingQuantity: med.remainingQuantity,
        });
      }
    }

    // Sort chronologically by scheduled time
    scheduleItems.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    const totalCount = scheduleItems.length;
    const completedCount = scheduleItems.filter((i) => i.status === 'taken').length;
    const adherenceScore = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    return NextResponse.json({
      date: targetDate,
      careProfileId,
      schedule: scheduleItems,
      items: scheduleItems,
      totalCount,
      completedCount,
      adherenceScore,
    });
  } catch (err: any) {
    console.error('[API Doses Today] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
