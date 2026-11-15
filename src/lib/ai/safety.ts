import { Medication, HealthLog } from '../../types';
import { 
  SafetyCheckResult, 
  generateFallbackSafetyCheck 
} from './fallback';
import { callGemini, isGeminiConfigured } from './gemini';

export interface CheckSafetyInput {
  medications: Medication[];
  healthLogs?: HealthLog[];
  allergies?: string[];
}

export async function checkMedicationSafety(
  input: CheckSafetyInput
): Promise<SafetyCheckResult> {
  // Compute deterministic baseline safety screening
  const fallback = generateFallbackSafetyCheck(input);

  if (!isGeminiConfigured() || input.medications.length === 0) {
    return fallback;
  }

  try {
    const systemInstruction = 
      "You are a clinical pharmacovigilance safety assistant for CareNest AI. " +
      "Review the active medications, patient allergies, and reported symptoms. " +
      "Identify non-diagnostic medication safety flags (e.g., food/timing cautions, sedation risks, " +
      "known allergy overlap, or herbal-drug interaction awareness). " +
      "Always state that this is an informational decision support reminder and NOT medical advice. " +
      "Return valid JSON matching: " +
      '{"additionalAlerts": [{"type": "timing|allergy|side_effect_correlation|interaction_note|inventory", "severity": "low|medium|high", "title": "...", "message": "...", "action": "..."}]}';

    const prompt = `
Medications (${input.medications.length}):
${input.medications.map(m => `- ${m.medicineName} (${m.dosage}, ${m.medicineCategory}): ${m.instructions}, Meal: ${m.mealRelation}, Times: [${(m.scheduledTimes || []).join(', ')}]`).join('\n')}

Known Allergies: ${input.allergies?.join(', ') || 'None reported'}

Recent Symptoms: ${input.healthLogs?.slice(0, 5).map(l => `${l.symptom} (${l.severity})`).join(', ') || 'None reported'}

Check for non-diagnostic safety reminders. Return JSON.
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
      if (Array.isArray(parsed.additionalAlerts) && parsed.additionalAlerts.length > 0) {
        // Merge with fallback alerts avoiding duplicate titles
        const existingTitles = new Set(fallback.alerts.map(a => a.title.toLowerCase()));
        const mergedAlerts = [...fallback.alerts];

        for (const item of parsed.additionalAlerts) {
          if (!existingTitles.has((item.title || '').toLowerCase())) {
            mergedAlerts.push({
              id: `ai-alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              type: item.type || 'interaction_note',
              severity: ['low', 'medium', 'high'].includes(item.severity) ? item.severity : 'medium',
              title: item.title,
              message: item.message,
              action: item.action || 'Discuss with healthcare provider.',
            });
          }
        }

        const highRiskCount = mergedAlerts.filter(a => a.severity === 'high').length;
        const mediumRiskCount = mergedAlerts.filter(a => a.severity === 'medium').length;
        const lowRiskCount = mergedAlerts.filter(a => a.severity === 'low').length;

        return {
          alerts: mergedAlerts,
          highRiskCount,
          mediumRiskCount,
          lowRiskCount,
          disclaimer: fallback.disclaimer,
          isAiGenerated: true,
          modelUsed: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        };
      }
    }
  } catch (error) {
    console.warn('[CareNest AI] Gemini Safety Check failed, falling back to deterministic template:', error);
  }

  return fallback;
}
