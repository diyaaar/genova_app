/** Request-local guard for privileged PostgREST clients (web and Edge).
 * The choir ID must come from a verified user's database membership, never a body/JWT metadata field.
 * Existing role/business checks still apply. Database link/immutability guards protect upsert conflicts.
 */
export const TENANT_TABLES = new Set([
  'announcements', 'assignment_submission_audit_logs', 'assignment_submission_history',
  'assignment_submission_private_notes', 'assignment_submissions', 'assignment_targets',
  'assignments', 'attendance', 'chat_message_status', 'chat_messages',
  'chat_notification_preferences', 'chat_poll_votes', 'chat_polls', 'chat_reactions',
  'chat_room_members', 'chat_rooms', 'chat_starred_messages', 'choir_member_roles',
  'choir_members', 'departments', 'profile_change_requests', 'push_subscriptions',
  'rehearsal_invitees', 'rehearsals', 'repertoire', 'repertoire_cache_versions',
  'repertoire_files', 'repertoire_pdf_annotations', 'repertoire_song_comments',
  'repertoire_song_tags', 'repertoire_tags', 'roles', 'schools', 'song_assignments',
]);

export function createTenantFetch(baseUrl: string, choirId: string, transport: typeof fetch = fetch): typeof fetch {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(choirId)) {
    throw new Error('Geçerli koro üyeliği bulunamadı.');
  }
  const origin = new URL(baseUrl).origin;
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== origin) throw new Error('Beklenmeyen Supabase adresi.');
    // Auth/Storage have independent authorization; never rewrite file payloads.
    if (!url.pathname.startsWith('/rest/v1/')) return transport(request);
    const table = decodeURIComponent(url.pathname.slice('/rest/v1/'.length));
    if (!TENANT_TABLES.has(table) ||
        (request.headers.get('Accept-Profile') ?? 'public') !== 'public' ||
        (request.headers.get('Content-Profile') ?? 'public') !== 'public') {
      throw new Error('Bu kaynak koro kapsamındaki istemciye açık değil.');
    }
    // Appending (rather than replacing) preserves caller filters as an AND.
    url.searchParams.append('choir_id', `eq.${choirId}`);
    if (request.method === 'POST' || request.method === 'PATCH') {
      const body: unknown = await request.json();
      const scopeRow = (row: unknown) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Geçersiz kayıt.');
        const value = row as Record<string, unknown>;
        if ('choir_id' in value && value.choir_id !== choirId) throw new Error('Koro kapsamı değiştirilemez.');
        return { ...value, choir_id: choirId };
      };
      const scoped = Array.isArray(body) ? body.map(scopeRow) : scopeRow(body);
      // supabase-js sends a column whitelist on bulk inserts.
      const columns = url.searchParams.get('columns');
      if (columns && !columns.split(',').some((column) => column.replaceAll('"', '') === 'choir_id')) {
        url.searchParams.set('columns', `${columns},"choir_id"`);
      }
      const headers = new Headers(request.headers);
      headers.delete('content-length');
      return transport(new Request(url, {
        method: request.method, headers, body: JSON.stringify(scoped), signal: request.signal,
      }));
    }
    if (!['GET', 'HEAD', 'DELETE'].includes(request.method)) throw new Error('Desteklenmeyen veri işlemi.');
    return transport(new Request(url, { method: request.method, headers: request.headers, signal: request.signal }));
  };
}
