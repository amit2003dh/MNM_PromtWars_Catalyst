import { HealthLog, Medication } from '../../types';
import { 
  SymptomSummaryResult, 
  generateFallbackSymptomSummary 
} from './fallback';
import { callGemini, isGeminiConfigured } from './gemini';

export interface SummarizeSymptomsInput {
  healthLogs: HealthLog[];
  careProfileName?: string;
  medications?: Medication[];
}

export async function summarizeSymptoms(
  input: SummarizeSymptomsInput
): Promise<SymptomSummaryResult> {
  const fallback = generateFallbackSymptomSummary({
    healthLogs: input.healthLogs,
    careProfileName: input.careProfileName,
  });

  if (!isGeminiConfigured() || input.healthLogs.length === 0) {
    return fallback;
  }

  try {
    const systemInstruction = 
      "You are a clinical nurse assistant. Analyze reported symptom logs for an elderly patient. " +
      "Identify patterns, correlate with active medications if relevant, highlight any severe concerns, " +
      "and generate concise clinical discussion points for their next doctor visit. " +
      "Always return valid JSON: " +
      '{"summary": "...", "trend": "improving|stable|concerning|needs_attention", "urgentConcerns": ["..."], "doctorDiscussionPoints": ["..."]}';

    const prompt = `
Patient: ${input.careProfileName || 'Patient'}
Active Medications: ${input.medications?.map(m => `${m.medicineName} (${m.dosage})`).join(', ') || 'None listed'}
Reported Symptoms (${input.healthLogs.length}):
${input.healthLogs.map(l => `- [${l.severity.toUpperCase()}] ${l.symptom} reported at ${l.reportedAt}${l.notes ? `: "${l.notes}"` : ''}`).join('\n')}

Analyze trend and discussion points. Return strictly JSON.
`.trim();

    const responseText = await callGemini({
      prompt,
      systemInstruction,
      temperature: 0.2,
      maxOutputTokens: 1024,
    });

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || fallback.summary,
        trend: ['improving', 'stable', 'concerning', 'needs_attention'].includes(parsed.trend) ? parsed.trend : fallback.trend,
        symptomCounts: fallback.symptomCounts,
        severeCount: fallback.severeCount,
        urgentConcerns: Array.isArray(parsed.urgentConcerns) ? parsed.urgentConcerns : fallback.urgentConcerns,
        doctorDiscussionPoints: Array.isArray(parsed.doctorDiscussionPoints) ? parsed.doctorDiscussionPoints : fallback.doctorDiscussionPoints,
        isAiGenerated: true,
        modelUsed: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      };
    }
  } catch (error) {
    console.warn('[CareNest AI] Gemini Symptom Summary failed, falling back to deterministic template:', error);
  }

  return fallback;
}
