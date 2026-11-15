import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { explainMedication } from '@/lib/ai/explain';

const ExplainRequestSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  dosage: z.string().optional().default('1 dose'),
  instructions: z.string().optional().default('Take as directed by doctor'),
  mealRelation: z.enum(['before_meal', 'after_meal', 'with_meal', 'empty_stomach', 'anytime']).optional().default('anytime'),
  pillColor: z.string().optional().default('White'),
  pillShape: z.string().optional().default('Round tablet'),
  category: z.enum(['allopathic', 'ayurvedic', 'herbal', 'otc']).optional().default('allopathic'),
});

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const validation = ExplainRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const explanation = await explainMedication(validation.data);

    return NextResponse.json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    console.error('[API /api/ai/explain] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error explaining medication' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const medicineName = searchParams.get('medicineName') || searchParams.get('name');

    if (!medicineName) {
      return NextResponse.json(
        { success: false, error: 'Query parameter ?medicineName is required' },
        { status: 400 }
      );
    }

    const dosage = searchParams.get('dosage') || '1 dose';
    const instructions = searchParams.get('instructions') || 'Take as directed';
    const mealRelation = (searchParams.get('mealRelation') as any) || 'anytime';
    const pillColor = searchParams.get('pillColor') || 'White';
    const pillShape = searchParams.get('pillShape') || 'Round';
    const category = (searchParams.get('category') as any) || 'allopathic';

    const explanation = await explainMedication({
      medicineName,
      dosage,
      instructions,
      mealRelation,
      pillColor,
      pillShape,
      category,
    });

    return NextResponse.json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
