import { 
  CareProfile, 
  Medication, 
  DoseEvent, 
  HealthLog, 
  CaregiverNote, 
  Appointment 
} from '../../types';
import { 
  DoctorSummaryResult, 
  generateFallbackDoctorSummary 
} from './fallback';
import { callGemini, isGeminiConfigured } from './gemini';

export interface GenerateDoctorSummaryInput {
  careProfile: CareProfile;
  medications: Medication[];
  doseEvents?: DoseEvent[];
  healthLogs?: HealthLog[];
  caregiverNotes?: CaregiverNote[];
  appointments?: Appointment[];
  timeframeDays?: number;
}

export async function generateDoctorSummary(
  input: GenerateDoctorSummaryInput
): Promise<DoctorSummaryResult> {
  // Always compute base deterministic metrics and fallback representation
  const fallback = generateFallbackDoctorSummary({
    careProfile: input.careProfile,
    medications: input.medications,
    doseEvents: input.doseEvents,
    healthLogs: input.healthLogs,
    caregiverNotes: input.caregiverNotes,
    timeframeDays: input.timeframeDays,
  });

  // If Gemini is not configured, return robust fallback immediately
  if (!isGeminiConfigured()) {
    return fallback;
  }

  try {
    const systemInstruction = 
      "You are an expert clinical medical summarizer for CareNest AI. " +
      "Your role is to produce a concise, professional, printable one-page doctor-ready clinical summary " +
      "based strictly on verified tamper-evident operational logs from the patient's home care circle. " +
      "Include structured sections: Patient Demographics & Baseline, Medication Regimen & Reconciliation, " +
      "Adherence Metrics, Symptom Observations, Caregiver Shift Notes, and 3-5 Suggested Questions for Attending Physician. " +
      "Format strictly in clean GitHub Markdown with clear markdown tables. Always maintain a professional non-diagnostic tone.";

    const prompt = `
Generate a printable one-page doctor-ready summary for the following elderly patient care profile:

PATIENT:
- Name: ${input.careProfile.fullName} (${input.careProfile.preferredName ? `Preferred: "${input.careProfile.preferredName}"` : ''})
- Age: ${input.careProfile.age} | Gender: ${input.careProfile.gender} | Blood Group: ${input.careProfile.bloodGroup || 'Unspecified'}
- Chronic Diagnoses: ${input.careProfile.chronicConditions?.join(', ') || 'None'}
- Allergies: ${input.careProfile.allergies?.join(', ') || 'No known drug allergies (NKDA)'}

VERIFIED ACTIVE MEDICATIONS (${fallback.activeMedications.length}):
${fallback.activeMedications.map(m => `- ${m.name} (${m.category.toUpperCase()}): ${m.dosage}, ${m.frequency}, Times: [${m.scheduledTimes.join(', ')}], Food: ${m.mealRelation}, Stock: ${m.remainingQuantity} remaining (Refill: ${m.refillWarning ? 'URGENT' : 'OK'})`).join('\n')}

OPERATIONAL ADHERENCE (Past ${input.timeframeDays || 7} Days):
- Overall Adherence: ${fallback.adherenceStats.adherencePercentage}%
- Doses Scheduled: ${fallback.adherenceStats.totalScheduled} | Taken: ${fallback.adherenceStats.totalTaken} | Missed: ${fallback.adherenceStats.totalMissed}

HEALTH SYMPTOMS LOGGED:
- Severe: ${fallback.symptomTrends.severityCounts.severe} | Moderate: ${fallback.symptomTrends.severityCounts.moderate} | Mild: ${fallback.symptomTrends.severityCounts.mild}
- Symptoms: ${Object.entries(fallback.symptomTrends.symptomCounts).map(([k, v]) => `${k}: ${v}x`).join(', ') || 'None reported'}
- Recent Logs: ${fallback.symptomTrends.recentSymptoms.slice(0, 5).map(s => `${s.date}: ${s.symptom} (${s.severity})`).join('; ') || 'None'}

CAREGIVER OBSERVATIONS:
${fallback.caregiverObservations.length > 0 ? fallback.caregiverObservations.join('\n') : 'No special notes'}

Please generate:
1. A complete, printable markdown clinical report suitable for the attending physician.
2. At the end, explicitly list a section "### 6. Suggested Discussion Points for Attending Physician" with 3-5 specific questions based on the medication combinations, adherence rate, and reported symptoms.
`.trim();

    const aiMarkdown = await callGemini({
      prompt,
      systemInstruction,
      temperature: 0.2,
      maxOutputTokens: 2500,
    });

    if (aiMarkdown && aiMarkdown.trim().length > 100) {
      // Extract questions from AI output if possible
      const questionsMatch = aiMarkdown.match(/### 6\.[^\n]*\n([\s\S]*?)(?:---|\n\n\*|\n\*Notice|$)/i);
      let aiQuestions = fallback.questionsForDoctor;
      if (questionsMatch && questionsMatch[1]) {
        const parsedLines = questionsMatch[1]
          .split('\n')
          .map(l => l.replace(/^\d+[\.\)]\s*|\-\s*/, '').trim())
          .filter(l => l.length > 10);
        if (parsedLines.length > 0) {
          aiQuestions = parsedLines;
        }
      }

      return {
        ...fallback,
        summaryMarkdown: aiMarkdown.trim(),
        questionsForDoctor: aiQuestions,
        isAiGenerated: true,
        modelUsed: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      };
    }
  } catch (error) {
    console.warn('[CareNest AI] Gemini Doctor Summary call failed, falling back to deterministic template:', error);
  }

  return fallback;
}
