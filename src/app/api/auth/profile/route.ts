import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsersCollection } from '@/lib/db';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const safeUser = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json({ user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const result = UpdateProfileSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
    }

    const usersCol = await getUsersCollection();
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (result.data.name) updates.name = result.data.name;
    if (result.data.phone !== undefined) updates.phone = result.data.phone;

    await usersCol.updateOne({ _id: user._id }, { $set: updates });

    const updated = await usersCol.findOne({ _id: user._id });
    const safeUser = {
      _id: updated._id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      phone: updated.phone,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return NextResponse.json({ success: true, user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
