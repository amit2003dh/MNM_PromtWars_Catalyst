import { NextResponse } from 'next/server';
import { getCurrentUser, verifyMembership } from '@/lib/auth';
import { getAuditLogsCollection, SEED_IDS } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const careProfileId = searchParams.get('careProfileId') || SEED_IDS.PROFILE_MEERA;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (user && careProfileId !== SEED_IDS.PROFILE_MEERA) {
      const { isMember } = await verifyMembership(user._id, careProfileId);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
    }

    const auditLogsCol = await getAuditLogsCollection();
    const logs = await auditLogsCol.find({ careProfileId }).sort({ createdAt: -1 }).limit(limit).toArray();

    return NextResponse.json({ auditLogs: logs });
  } catch (err: any) {
    console.error('[API AuditLogs GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error', message: err?.message }, { status: 500 });
  }
}
