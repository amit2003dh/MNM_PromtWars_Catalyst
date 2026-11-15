import { 
  CareProfile, 
  Medication, 
  DoseEvent, 
  HealthLog, 
  CaregiverNote, 
  MealRelation,
  MedicineCategory 
} from '../../types';

export interface DoctorSummaryResult {
  patientInfo: {
    fullName: string;
    preferredName?: string;
    age: number;
    gender: string;
    bloodGroup?: string;
    allergies: string[];
    chronicConditions: string[];
    emergencyContacts: Array<{ name: string; relationship: string; phone: string }>;
  };
  adherenceStats: {
    totalScheduled: number;
    totalTaken: number;
    totalMissed: number;
    totalSkipped: number;
    adherencePercentage: number;
    streakDays: number;
  };
  activeMedications: Array<{
    name: string;
    category: MedicineCategory;
    dosage: string;
    frequency: string;
    scheduledTimes: string[];
    mealRelation: MealRelation;
    pillVisual: string;
    remainingQuantity: number;
    refillWarning: boolean;
    reconciliationStatus?: string;
  }>;
  symptomTrends: {
    totalLogged: number;
    symptomCounts: Record<string, number>;
    severityCounts: { mild: number; moderate: number; severe: number };
    recentSymptoms: Array<{ symptom: string; severity: string; date: string; notes?: string }>;
    clinicalObservation: string;
  };
  caregiverObservations: string[];
  questionsForDoctor: string[];
  summaryMarkdown: string;
  generatedAt: string;
  isAiGenerated: boolean;
  modelUsed: string;
}

export interface MedicationExplanationResult {
  medicineName: string;
  dosage: string;
  category: string;
  simpleInstructions: string;
  whenToTake: string;
  howToTake: string;
  foodInstructions: string;
  pillDescription: string;
  cautions: string[];
  speechText: string;
  isAiGenerated: boolean;
  modelUsed: string;
}

export interface SymptomSummaryResult {
  summary: string;
  trend: 'improving' | 'stable' | 'concerning' | 'needs_attention';
  symptomCounts: Record<string, number>;
  severeCount: number;
  urgentConcerns: string[];
  doctorDiscussionPoints: string[];
  isAiGenerated: boolean;
  modelUsed: string;
}

export interface SafetyAlertItem {
  id: string;
  type: 'timing' | 'allergy' | 'side_effect_correlation' | 'interaction_note' | 'inventory' | 'adherence';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  action: string;
}

export interface SafetyCheckResult {
  alerts: SafetyAlertItem[];
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  disclaimer: string;
  isAiGenerated: boolean;
  modelUsed: string;
}

/**
 * Format meal relation into friendly English
 */
export function formatMealRelation(relation: MealRelation | string): string {
  switch (relation) {
    case 'before_meal':
      return 'Take 30 minutes before meal';
    case 'after_meal':
      return 'Take within 30 minutes after meal';
    case 'with_meal':
      return 'Take along with meal';
    case 'empty_stomach':
      return 'Take on an empty stomach (at least 1 hour before or 2 hours after food)';
    case 'anytime':
    default:
      return 'Can be taken with or without food';
  }
}

/**
 * Deterministic fallback generator for Doctor Summary
 */
export function generateFallbackDoctorSummary(params: {
  careProfile: CareProfile;
  medications: Medication[];
  doseEvents?: DoseEvent[];
  healthLogs?: HealthLog[];
  caregiverNotes?: CaregiverNote[];
  timeframeDays?: number;
}): DoctorSummaryResult {
  const { 
    careProfile, 
    medications = [], 
    doseEvents = [], 
    healthLogs = [], 
    caregiverNotes = [],
    timeframeDays = 7 
  } = params;

  // Filter active medications
  const activeMeds = medications.filter(m => m.status === 'active' || !m.status);

  // Calculate adherence statistics
  const totalScheduled = doseEvents.length;
  const totalTaken = doseEvents.filter(d => d.status === 'taken').length;
  const totalMissed = doseEvents.filter(d => d.status === 'missed').length;
  const totalSkipped = doseEvents.filter(d => d.status === 'skipped').length;
  const adherencePercentage = totalScheduled > 0 
    ? Math.round((totalTaken / totalScheduled) * 100) 
    : 100;

  // Calculate symptom trends
  const symptomCounts: Record<string, number> = {};
  const severityCounts = { mild: 0, moderate: 0, severe: 0 };
  const recentSymptoms: Array<{ symptom: string; severity: string; date: string; notes?: string }> = [];

  for (const log of healthLogs) {
    symptomCounts[log.symptom] = (symptomCounts[log.symptom] || 0) + 1;
    if (log.severity === 'severe') severityCounts.severe++;
    else if (log.severity === 'moderate') severityCounts.moderate++;
    else severityCounts.mild++;

    recentSymptoms.push({
      symptom: log.symptom.replace(/_/g, ' '),
      severity: log.severity,
      date: new Date(log.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: log.notes
    });
  }

  // Identify clinical observation
  let clinicalObservation = 'No abnormal acute symptoms reported in the designated evaluation period.';
  if (severityCounts.severe > 0) {
    clinicalObservation = `ALERT: ${severityCounts.severe} severe symptom event(s) logged. Requires immediate physician review.`;
  } else if (severityCounts.moderate > 0) {
    clinicalObservation = `Moderate symptoms recorded (${severityCounts.moderate} occurrence(s)), primarily: ${Object.keys(symptomCounts).join(', ')}.`;
  } else if (healthLogs.length > 0) {
    clinicalObservation = `Mild symptoms recorded (${healthLogs.length} event(s)). Vital trends and comfort remain generally stable.`;
  }

  // Active medications mapped
  const mappedMeds = activeMeds.map(m => ({
    name: m.medicineName,
    category: m.medicineCategory || 'allopathic',
    dosage: m.dosage,
    frequency: m.frequency,
    scheduledTimes: m.scheduledTimes || [],
    mealRelation: m.mealRelation,
    pillVisual: `${m.pillColor || 'White'} ${m.pillShape || 'Round'}`,
    remainingQuantity: m.remainingQuantity,
    refillWarning: m.remainingQuantity <= (m.refillThreshold || 5),
    reconciliationStatus: m.reconciliationStatus || 'CONTINUE'
  }));

  // Caregiver notes summary
  const caregiverObservations = caregiverNotes.slice(0, 5).map(n => 
    `[${n.shiftDate || new Date(n.createdAt).toLocaleDateString()}] ${n.authorName} (${n.authorRole}): "${n.noteContent}"`
  );

  // Formulate questions for doctor review
  const questionsForDoctor: string[] = [];
  if (adherencePercentage < 80 && totalScheduled > 0) {
    questionsForDoctor.push(`Adherence rate was ${adherencePercentage}%. Are there pill-swallowing difficulties or regimen complexities to simplify?`);
  }
  if (symptomCounts['dizziness'] || symptomCounts['weakness']) {
    questionsForDoctor.push('Patient reported recurring episodes of dizziness/weakness. Should blood pressure or glycemic control parameters be adjusted?');
  }
  if (activeMeds.some(m => m.medicineCategory === 'ayurvedic' || m.medicineCategory === 'herbal')) {
    questionsForDoctor.push('Review concurrent usage of allopathic medications with Ayurvedic/herbal supplements for potential interactions.');
  }
  if (mappedMeds.some(m => m.refillWarning)) {
    const refillNames = mappedMeds.filter(m => m.refillWarning).map(m => m.name).join(', ');
    questionsForDoctor.push(`Prescription renewal recommended for low-stock medications: ${refillNames}.`);
  }
  if (questionsForDoctor.length === 0) {
    questionsForDoctor.push('Current medication regimen demonstrated high tolerance with stable adherence. Routine review.');
  }

  // Generate clean Markdown printable report
  const nowStr = new Date().toISOString();
  const dateFormatted = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const summaryMarkdown = `
# CareNest AI — Clinical Health & Medication Summary
**Doctor-Ready Comprehensive One-Page Report**
*Generated on ${dateFormatted} (${timeframeDays}-day verified audit window)*

---

### 1. Patient Demographics & Baseline Profile
- **Full Legal Name:** ${careProfile.fullName} ${careProfile.preferredName ? `("${careProfile.preferredName}")` : ''}
- **Age / Gender:** ${careProfile.age} years old | ${careProfile.gender}
- **Blood Group:** ${careProfile.bloodGroup || 'Not specified'}
- **Chronic Diagnoses:** ${careProfile.chronicConditions?.length ? careProfile.chronicConditions.join(', ') : 'None documented'}
- **Known Drug / Food Allergies:** ${careProfile.allergies?.length ? `⚠️ **${careProfile.allergies.join(', ')}**` : 'No known drug allergies (NKDA)'}
- **Emergency Contact:** ${careProfile.emergencyContacts?.map(c => `${c.name} (${c.relationship}): ${c.phone}`).join(' | ') || 'None listed'}

---

### 2. Verified Medication Regimen & Reconciliation
| Medication | Category | Dosage & Frequency | Scheduled Timing | Meal Relation | Status | Stock |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${mappedMeds.map(m => `| **${m.name}** | ${m.category.toUpperCase()} | ${m.dosage} (${m.frequency}) | ${(m.scheduledTimes || []).join(', ') || 'N/A'} | ${formatMealRelation(m.mealRelation)} | ${m.reconciliationStatus} | ${m.remainingQuantity} left ${m.refillWarning ? '⚠️ (Refill Soon)' : '✅'} |`).join('\n')}

---

### 3. Medication Adherence Metrics (${timeframeDays}-Day Window)
- **Overall Adherence Rate:** **${adherencePercentage}%** (${totalTaken} taken of ${totalScheduled} scheduled doses)
- **Status Breakdown:** Taken: ${totalTaken} | Missed: ${totalMissed} | Skipped: ${totalSkipped}
- **Adherence Evaluation:** ${adherencePercentage >= 90 ? '✅ Excellent adherence observed.' : adherencePercentage >= 75 ? '⚠️ Moderate adherence. Occasional missed doses.' : '🚨 Sub-optimal adherence detected. Clinical intervention suggested.'}

---

### 4. Symptom Journal & Vital Observations
- **Clinical Overview:** ${clinicalObservation}
- **Symptom Frequency:** ${Object.entries(symptomCounts).map(([k, v]) => `${k.replace(/_/g, ' ')} (${v}x)`).join(', ') || 'None reported'}
- **Severity Breakdown:** Mild: ${severityCounts.mild} | Moderate: ${severityCounts.moderate} | Severe: ${severityCounts.severe}
${recentSymptoms.length > 0 ? `\n**Recent Events:**\n` + recentSymptoms.slice(0, 5).map(s => `- *${s.date}*: **${s.symptom}** [${s.severity.toUpperCase()}] ${s.notes ? `— "${s.notes}"` : ''}`).join('\n') : ''}

---

### 5. Shift Handoff & Caregiver Observations
${caregiverObservations.length > 0 
  ? caregiverObservations.map(o => `- ${o}`).join('\n') 
  : '- Routine care administered with no acute incidents reported.'}

---

### 6. Suggested Discussion Points for Attending Physician
${questionsForDoctor.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}

---

*Notice: This report was compiled deterministically from tamper-evident operational logs recorded in CareNest AI. It is intended solely as clinical decision support for certified medical practitioners and does not constitute an automated medical diagnosis.*
`.trim();

  return {
    patientInfo: {
      fullName: careProfile.fullName,
      preferredName: careProfile.preferredName,
      age: careProfile.age,
      gender: careProfile.gender,
      bloodGroup: careProfile.bloodGroup,
      allergies: careProfile.allergies || [],
      chronicConditions: careProfile.chronicConditions || [],
      emergencyContacts: careProfile.emergencyContacts || [],
    },
    adherenceStats: {
      totalScheduled,
      totalTaken,
      totalMissed,
      totalSkipped,
      adherencePercentage,
      streakDays: totalTaken > 0 ? Math.min(Math.floor(totalTaken / 2), 7) : 0,
    },
    activeMedications: mappedMeds,
    symptomTrends: {
      totalLogged: healthLogs.length,
      symptomCounts,
      severityCounts,
      recentSymptoms,
      clinicalObservation,
    },
    caregiverObservations,
    questionsForDoctor,
    summaryMarkdown,
    generatedAt: nowStr,
    isAiGenerated: false,
    modelUsed: 'deterministic-clinical-template',
  };
}

/**
 * Deterministic fallback generator for Medication Plain Language Explanation
 */
export function generateFallbackMedicationExplanation(params: {
  medicineName: string;
  dosage?: string;
  instructions?: string;
  mealRelation?: MealRelation | string;
  pillColor?: string;
  pillShape?: string;
  category?: MedicineCategory | string;
}): MedicationExplanationResult {
  const medicineName = params.medicineName || 'Medication';
  const dosage = params.dosage || '1 dose';
  const category = (params.category || 'allopathic').toLowerCase();
  const mealRelation = params.mealRelation || 'anytime';
  const foodInstruction = formatMealRelation(mealRelation);
  const pillColor = params.pillColor || 'standard';
  const pillShape = params.pillShape || 'tablet';
  const pillDescription = `${pillColor} ${pillShape}`.trim();

  const whenToTake = mealRelation === 'before_meal' 
    ? 'Take this medicine 30 minutes before your meal with plain water.'
    : mealRelation === 'after_meal'
    ? 'Take this medicine within 30 minutes after your meal so it does not upset your stomach.'
    : mealRelation === 'empty_stomach'
    ? 'Take this first thing in the morning on an empty stomach with a full glass of water.'
    : mealRelation === 'with_meal'
    ? 'Take this medicine right while having your meal.'
    : 'Take this at your designated scheduled time with water.';

  const howToTake = 'Swallow whole with a full glass of drinking water. Do not crush, chew, or break unless your doctor specifically told you to.';

  const cautions = [
    'Take this medicine at the same time every day to keep a steady level in your body.',
    'Never take two doses at the same time if you miss a dose.',
    'Keep your medicines in their original container away from moisture and direct sunlight.',
  ];

  if (category === 'ayurvedic' || category === 'herbal') {
    cautions.push('Inform your doctor if you are taking prescription blood pressure, diabetes, or heart medications alongside this.');
  }

  const simpleInstructions = `
1. **Medicine Name**: ${medicineName} (${dosage})
2. **When to Take**: ${whenToTake}
3. **How to Take**: ${howToTake}
4. **Food Instructions**: ${foodInstruction}
5. **Appearance**: Look for your ${pillDescription} in your pillbox.
`.trim();

  // Optimized for Web Speech API text-to-speech for seniors
  const speechText = `Hello. Your medicine is ${medicineName}, dosage ${dosage}. ${whenToTake} ${howToTake} Look for your ${pillDescription}. Please press the green button once you have taken it.`;

  return {
    medicineName,
    dosage,
    category,
    simpleInstructions,
    whenToTake,
    howToTake,
    foodInstructions: foodInstruction,
    pillDescription,
    cautions,
    speechText,
    isAiGenerated: false,
    modelUsed: 'deterministic-plain-template',
  };
}

/**
 * Deterministic fallback generator for Symptom Summary
 */
export function generateFallbackSymptomSummary(params: {
  healthLogs: HealthLog[];
  careProfileName?: string;
}): SymptomSummaryResult {
  const { healthLogs = [], careProfileName = 'The patient' } = params;

  const symptomCounts: Record<string, number> = {};
  let severeCount = 0;
  const urgentConcerns: string[] = [];
  const doctorDiscussionPoints: string[] = [];

  for (const log of healthLogs) {
    symptomCounts[log.symptom] = (symptomCounts[log.symptom] || 0) + 1;
    if (log.severity === 'severe') {
      severeCount++;
      urgentConcerns.push(`Severe ${log.symptom.replace(/_/g, ' ')} reported on ${new Date(log.reportedAt).toLocaleDateString()}`);
    }
  }

  let trend: 'improving' | 'stable' | 'concerning' | 'needs_attention' = 'stable';
  if (severeCount > 0) {
    trend = 'concerning';
  } else if (healthLogs.length > 5) {
    trend = 'needs_attention';
  }

  if (symptomCounts['dizziness'] && symptomCounts['dizziness'] >= 2) {
    doctorDiscussionPoints.push('Multiple dizzy spells recorded. Check orthostatic vitals and anti-hypertensive dosing.');
  }
  if (symptomCounts['stomach_discomfort']) {
    doctorDiscussionPoints.push('Stomach discomfort noted. Verify if NSAIDs or antibiotics are properly administered with food.');
  }
  if (doctorDiscussionPoints.length === 0) {
    doctorDiscussionPoints.push('Monitor baseline comfort and record any changes in energy or sleep.');
  }

  const summary = `${careProfileName} has logged ${healthLogs.length} symptom report(s) during this period. ` +
    (severeCount > 0 
      ? `ATTENTION: ${severeCount} severe episode(s) require prompt medical review.` 
      : 'Symptoms reported are mild to moderate with no immediate acute alarms.');

  return {
    summary,
    trend,
    symptomCounts,
    severeCount,
    urgentConcerns,
    doctorDiscussionPoints,
    isAiGenerated: false,
    modelUsed: 'deterministic-symptom-template',
  };
}

/**
 * Deterministic fallback generator for Medication Safety Checks
 */
export function generateFallbackSafetyCheck(params: {
  medications: Medication[];
  healthLogs?: HealthLog[];
  allergies?: string[];
}): SafetyCheckResult {
  const { medications = [], healthLogs = [], allergies = [] } = params;
  const alerts: SafetyAlertItem[] = [];

  // 1. Inventory Refill Alerts
  for (const med of medications) {
    if (med.status === 'active' && med.remainingQuantity <= (med.refillThreshold || 5)) {
      alerts.push({
        id: `refill-${med._id || med.medicineName}`,
        type: 'inventory',
        severity: med.remainingQuantity <= 2 ? 'high' : 'medium',
        title: `Low Stock: ${med.medicineName}`,
        message: `Only ${med.remainingQuantity} units remaining for ${med.medicineName}. Refill threshold is ${med.refillThreshold || 5}.`,
        action: 'Contact pharmacy or request family member to order refill.',
      });
    }
  }

  // 2. Empty Stomach vs With Meal Timing Awareness
  const emptyStomachMeds = medications.filter(m => m.status === 'active' && m.mealRelation === 'empty_stomach');
  const withMealMeds = medications.filter(m => m.status === 'active' && (m.mealRelation === 'with_meal' || m.mealRelation === 'after_meal'));
  
  if (emptyStomachMeds.length > 0 && withMealMeds.length > 0) {
    // Check if scheduled at the exact same hour
    for (const emptyMed of emptyStomachMeds) {
      for (const mealMed of withMealMeds) {
        const overlapTimes = (emptyMed.scheduledTimes || []).filter(t => (mealMed.scheduledTimes || []).includes(t));
        if (overlapTimes.length > 0) {
          alerts.push({
            id: `timing-conflict-${emptyMed._id}-${mealMed._id}`,
            type: 'timing',
            severity: 'medium',
            title: `Meal Timing Separation Needed`,
            message: `${emptyMed.medicineName} is scheduled at the same time (${overlapTimes.join(', ')}) as ${mealMed.medicineName}, but requires an empty stomach.`,
            action: `Administer ${emptyMed.medicineName} 30 to 60 minutes before breakfast/meals.`,
          });
        }
      }
    }
  }

  // 3. Known Allergy Screen
  if (allergies && allergies.length > 0) {
    for (const med of medications) {
      for (const allergy of allergies) {
        const allergyLower = allergy.toLowerCase().trim();
        const medNameLower = med.medicineName.toLowerCase();
        if (allergyLower && (medNameLower.includes(allergyLower) || allergyLower.includes(medNameLower))) {
          alerts.push({
            id: `allergy-${med._id}-${allergy}`,
            type: 'allergy',
            severity: 'high',
            title: `Potential Allergy Overlap`,
            message: `Medication "${med.medicineName}" may match patient allergy record: "${allergy}".`,
            action: 'Verify with prescribing physician immediately before taking.',
          });
        }
      }
    }
  }

  // 4. Correlate dizziness symptoms with multiple blood pressure / sedative medications
  const dizzinessLogs = healthLogs.filter(l => l.symptom === 'dizziness' || l.symptom === 'confusion');
  if (dizzinessLogs.length >= 2) {
    alerts.push({
      id: 'side-effect-dizziness',
      type: 'side_effect_correlation',
      severity: 'medium',
      title: 'Dizziness Pattern Detected',
      message: `${dizzinessLogs.length} instances of dizziness or confusion recorded. Potential relation to antihypertensive or evening sedative medications.`,
      action: 'Log seated/standing blood pressure and notify primary caregiver.',
    });
  }

  // 5. Multi-category (Ayurvedic + Allopathic) concurrent awareness
  const hasAyurvedic = medications.some(m => m.status === 'active' && m.medicineCategory === 'ayurvedic');
  const hasAllopathic = medications.some(m => m.status === 'active' && m.medicineCategory === 'allopathic');
  if (hasAyurvedic && hasAllopathic) {
    alerts.push({
      id: 'polypharmacy-category-note',
      type: 'interaction_note',
      severity: 'low',
      title: 'Concurrent Allopathic & Ayurvedic Regimen',
      message: 'Both conventional and Ayurvedic medicines are active. Ensure minimum 1-hour separation between dosages.',
      action: 'Confirm compatibility during next doctor consultation.',
    });
  }

  const highRiskCount = alerts.filter(a => a.severity === 'high').length;
  const mediumRiskCount = alerts.filter(a => a.severity === 'medium').length;
  const lowRiskCount = alerts.filter(a => a.severity === 'low').length;

  return {
    alerts,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    disclaimer: 'Informational safety screening based on recorded rules. This is non-diagnostic operational decision support and not a substitute for clinical judgment.',
    isAiGenerated: false,
    modelUsed: 'deterministic-safety-engine',
  };
}
