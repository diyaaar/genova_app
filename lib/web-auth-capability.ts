import {
  browserSupabase,
  getEmbeddedLeaseSnapshot,
  notifyEmbeddedUnauthorized,
  requireEmbeddedAccess,
} from './supabase';
import type { EmbeddedAccessKind } from './embedded-web-runtime';

export interface CurrentWebAccess {
  accessToken: string;
  userId: string;
}

/** Returns the current bearer without allowing embedded mode to consult or create a browser session. */
export async function requireCurrentWebAccess(kind: EmbeddedAccessKind = 'read'): Promise<CurrentWebAccess> {
  if (getEmbeddedLeaseSnapshot().mode === 'embedded') {
    return requireEmbeddedAccess(kind);
  }

  const { data, error } = await browserSupabase.auth.getSession();
  if (error || !data.session?.access_token || !data.session.user?.id) {
    throw new Error('Oturum bulunamadı.');
  }
  return {
    accessToken: data.session.access_token,
    userId: data.session.user.id,
  };
}

/** Adds the current bearer, enforces renewal mutation freeze and reports one embedded 401 centrally. */
export async function authenticatedWebFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  existingAccess?: CurrentWebAccess,
): Promise<Response> {
  const method = (init.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
  const kind: EmbeddedAccessKind = method === 'GET' || method === 'HEAD' ? 'read' : 'mutation';
  let access = existingAccess;
  if (!access) {
    access = await requireCurrentWebAccess(kind);
  } else if (getEmbeddedLeaseSnapshot().mode === 'embedded') {
    const current = requireEmbeddedAccess(kind);
    if (current.userId !== access.userId) throw new Error('embedded-context-changed');
    access = current;
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${access.accessToken}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) notifyEmbeddedUnauthorized();
  return response;
}

export function isEmbeddedWebAuth(): boolean {
  return getEmbeddedLeaseSnapshot().mode === 'embedded';
}
