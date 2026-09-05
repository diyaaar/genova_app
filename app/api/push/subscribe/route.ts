import { NextResponse } from 'next/server';

import { createSupabaseUserClient, requireAuthenticatedUser } from '@/lib/server/supabase-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PushSubscriptionBody {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export async function POST(request: Request) {
  try {
    const { accessToken } = await requireAuthenticatedUser(request);
    const body = (await request.json()) as PushSubscriptionBody;

    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return new NextResponse('Geçersiz PushSubscription payload.', { status: 400 });
    }

    const userClient = createSupabaseUserClient(accessToken);
    const { error: upsertError } = await userClient.rpc('upsert_my_active_push_subscription', {
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_agent: request.headers.get('user-agent') ?? null,
    });

    if (upsertError) {
      return new NextResponse(upsertError.message, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Unauthorized' ? 401 : 500;
    return new NextResponse(message, { status });
  }
}
