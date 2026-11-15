import { GoogleGenerativeAI } from '@google/generative-ai';

let genAIClient: GoogleGenerativeAI | null = null;

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(
    key && 
    key.trim() !== '' && 
    key !== 'your-gemini-api-key' && 
    !key.includes('placeholder')
  );
}

export function getGeminiClient(): GoogleGenerativeAI | null {
  if (!isGeminiConfigured()) {
    return null;
  }
  if (!genAIClient) {
    const key = process.env.GEMINI_API_KEY!;
    genAIClient = new GoogleGenerativeAI(key);
  }
  return genAIClient;
}

export async function callGemini(params: {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  modelName?: string;
  timeoutMs?: number;
}): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY is not configured or is a placeholder.');
  }

  const modelName = params.modelName || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: params.systemInstruction,
    generationConfig: {
      temperature: params.temperature ?? 0.2,
      maxOutputTokens: params.maxOutputTokens ?? 2048,
    },
  });

  const timeoutMs = params.timeoutMs ?? 15000;
  
  // Wrap with timeout promise
  const generatePromise = model.generateContent(params.prompt).then(res => {
    const response = res.response;
    return response.text();
  });

  const timeoutPromise = new Promise<string>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    // Unref timer if node supports it
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  });

  return await Promise.race([generatePromise, timeoutPromise]);
}
