import { MealRelation, MedicineCategory } from '../../types';
import { 
  MedicationExplanationResult, 
  generateFallbackMedicationExplanation 
} from './fallback';
import { callGemini, isGeminiConfigured } from './gemini';

export interface ExplainMedicationInput {
  medicineName: string;
  dosage?: string;
  instructions?: string;
  mealRelation?: MealRelation | string;
  pillColor?: string;
  pillShape?: string;
  category?: MedicineCategory | string;
}

export async function explainMedication(
  input: ExplainMedicationInput
): Promise<MedicationExplanationResult> {
  // Always produce robust fallback
  const fallback = generateFallbackMedicationExplanation(input);

  if (!isGeminiConfigured()) {
    return fallback;
  }

  try {
    const systemInstruction = 
      "You are a compassionate, patient geriatric nurse assistant. " +
      "Explain medication instructions in crystal clear, simple, reassuring plain English " +
      "for an elderly person who may have vision difficulty or cognitive fatigue. " +
      "Do NOT use medical jargon. Include clear food instructions, pill appearance guidance, " +
      "and a warm 2-sentence spoken script for voice read-aloud. " +
      "Return valid JSON matching this schema: " +
      '{"simpleInstructions": "...", "whenToTake": "...", "howToTake": "...", "foodInstructions": "...", "cautions": ["..."], "speechText": "..."}';

    const prompt = `
Explain this medicine for an elderly patient:
- Medicine Name: ${input.medicineName}
- Dosage: ${input.dosage || 'Standard prescribed dose'}
- Doctor/Label Instructions: ${input.instructions || 'As prescribed'}
- Food / Meal Timing: ${input.mealRelation || 'anytime'}
- Pill Appearance: ${input.pillColor || 'White'} ${input.pillShape || 'Round'}
- Category: ${input.category || 'allopathic'}

Provide simple bulleted instructions, clear warnings (never double dose), and a warm spoken script for voice read-aloud. Return strictly JSON.
`.trim();

    const responseText = await callGemini({
      prompt,
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        medicineName: input.medicineName,
        dosage: input.dosage || fallback.dosage,
        category: (input.category || 'allopathic').toString(),
        simpleInstructions: parsed.simpleInstructions || fallback.simpleInstructions,
        whenToTake: parsed.whenToTake || fallback.whenToTake,
        howToTake: parsed.howToTake || fallback.howToTake,
        foodInstructions: parsed.foodInstructions || fallback.foodInstructions,
        pillDescription: fallback.pillDescription,
        cautions: Array.isArray(parsed.cautions) && parsed.cautions.length > 0 ? parsed.cautions : fallback.cautions,
        speechText: parsed.speechText || fallback.speechText,
        isAiGenerated: true,
        modelUsed: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      };
    }
  } catch (error) {
    console.warn('[CareNest AI] Gemini Medication Explain failed, falling back to deterministic template:', error);
  }

  return fallback;
}
