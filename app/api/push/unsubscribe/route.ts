import { NextResponse } from 'next/server';

import { createSupabaseUserClient, requireAuthenticatedUser } from '@/lib/server/supabase-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UnsubscribeBody {
  endpoint?: string;
}

export async function POST(request: Request) {
  try {
    const { accessToken } = await requireAuthenticatedUser(request);
    const body = (await request.json()) as UnsubscribeBody;
    const endpoint = body.endpoint?.trim();

    if (!endpoint) {
      return new NextResponse('endpoint zorunlu.', { status: 400 });
    }

    const userClient = createSupabaseUserClient(accessToken);
    const { error: deleteError } = await userClient.rpc('delete_my_push_subscription', {
      p_endpoint: endpoint,
    });

    if (deleteError) {
      return new NextResponse(deleteError.message, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Unauthorized' ? 401 : 500;
    return new NextResponse(message, { status });
  }
}
