// Run against an already-built loopback candidate. Every account/provider response is synthetic.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = 'http://127.0.0.1:4174';
const supabaseOrigin = 'https://example.supabase.co';
const choir = '20000000-0000-4000-8000-000000000058';
const reviewer = '30000000-0000-4000-8000-000000000058';
const singer = '30000000-0000-4000-8000-000000000059';
const user = '10000000-0000-4000-8000-000000000058';
const assignmentId = '50000000-0000-4000-8000-000000000058';
const submissionId = '60000000-0000-4000-8000-000000000058';
const submissionVersion = '70000000-0000-4000-8000-000000000058';
const reviewVersions = ['80000000-0000-4000-8000-000000000058', '80000000-0000-4000-8000-000000000059'];
const expires = Math.floor(Date.now() / 1000) + 3600;
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user, session_id: '71000000-0000-4000-8000-000000000058', exp: expires, role: 'authenticated', aud: 'authenticated' })).toString('base64url')}.synthetic`;
const session = { access_token: token, refresh_token: 'synthetic', token_type: 'bearer', expires_in: 3600, expires_at: expires, user: { id: user, aud: 'authenticated', role: 'authenticated', email: '058@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-09-23T00:00:00Z' } };
const reviewerRow = { id: reviewer, choir_id: choir, auth_user_id: user, first_name: 'Synthetic', last_name: 'Chef', voice_group: 'Soprano', sub_voice_group: null, photo_url: null, is_active: true, join_date: '2026-01-01', email: '058@example.invalid', phone: null, birth_date: null, school_id: null, department_id: null, favorite_song_id: null, about_text: null, linkedin_url: null, instagram_url: null, youtube_url: null, spotify_url: null, tiktok_url: null, x_url: null, schools: null, departments: null, repertoire: null };
const singerRow = { id: singer, choir_id: choir, auth_user_id: '10000000-0000-4000-8000-000000000059', first_name: 'Target', last_name: 'Singer', voice_group: 'Soprano', photo_url: null, is_active: true, join_date: '2026-01-01', email: 'singer@example.invalid' };
const assignment = { id: assignmentId, choir_id: choir, title: '058 Private Review Audio', description: 'Synthetic acceptance', deadline: null, target_voice_group: 'Soprano', drive_folder_id: null, created_by: reviewer, is_active: true, is_locked: false, locked_at: null, locked_by: null, created_at: '2026-09-23T00:00:00Z', updated_at: '2026-09-23T00:00:00Z', choir_members: { first_name: 'Synthetic', last_name: 'Chef', photo_url: null } };
const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.from([40, 0, 0, 0]), Buffer.from('WAVEfmt '), Buffer.alloc(24)]);
const now = () => new Date().toISOString();
const reviewFields = (version, fileName) => ({ reviewer_note: `review-${fileName}`, reviewer_audio_drive_file_id: `r2_${version}`, reviewer_audio_file_version_id: version, reviewer_audio_file_name: fileName, reviewer_audio_mime_type: 'audio/wav', reviewer_audio_file_size_bytes: wav.length });
let current = { id: submissionId, assignment_id: assignmentId, member_id: singer, drive_file_id: `r2_${submissionVersion}`, drive_web_view_link: null, drive_download_link: null, current_file_version_id: submissionVersion, file_name: 'singer-take.wav', mime_type: 'audio/wav', file_size_bytes: wav.length, drive_member_folder_id: null, submitted_at: now(), updated_at: now(), status: 'pending', submission_note: 'Synthetic submission', reviewer_note: null, reviewer_audio_drive_file_id: null, reviewer_audio_file_version_id: null, reviewer_audio_file_name: null, reviewer_audio_mime_type: null, reviewer_audio_file_size_bytes: null, is_reviewer_note_hidden: false, hidden_by: null, hidden_at: null, approved_at: null, approved_by: null };
let privateReview = null;
let history = [];
let privateHistory = [];
let reviewUploadCount = 0;
let notifyCount = 0;
let hideCount = 0;
let noteOnlyCount = 0;
let reviewTicketCount = 0;
let reviewReadCount = 0;
let driveHits = 0;
const errors = [];
const seen = [];

function visibleReview(version, fileName) {
  current = { ...current, status: 'approved', ...reviewFields(version, fileName), is_reviewer_note_hidden: false, hidden_by: null, hidden_at: null, approved_at: now(), approved_by: reviewer, updated_at: now() };
  privateReview = { submission_id: submissionId, ...reviewFields(version, fileName) };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await context.addInitScript((stored) => localStorage.setItem('sb-example-auth-token', JSON.stringify(stored)), session);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    seen.push(`${request.method()} ${url.origin}${url.pathname}`);
    const respond = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if ((url.hostname === '127.0.0.1' || url.hostname === 'localhost') && url.port === '4174') {
      if (url.pathname === '/api/assignment-submissions/review') {
        const contentType = request.headers()['content-type'] ?? '';
        if (contentType.includes('application/json')) {
          notifyCount++;
          const body = request.postDataJSON();
          assert.equal(body.action, 'notify_private_review');
          assert.equal(body.fileVersionId, current.reviewer_audio_file_version_id);
          return route.fulfill({ status: 204, body: '' });
        }
        noteOnlyCount++;
        current = { ...current, status: 'approved', reviewer_note: 'note-only-review', reviewer_audio_drive_file_id: null, reviewer_audio_file_version_id: null, reviewer_audio_file_name: null, reviewer_audio_mime_type: null, reviewer_audio_file_size_bytes: null, is_reviewer_note_hidden: false, approved_at: now(), approved_by: reviewer, updated_at: now() };
        privateReview = null;
        return respond(current);
      }
      if (url.pathname === '/api/assignment-submissions/hide-review') {
        hideCount++;
        const { hidden } = request.postDataJSON();
        assert.equal(typeof hidden, 'boolean');
        if (hidden) {
          privateReview = { submission_id: submissionId, ...reviewFields(current.reviewer_audio_file_version_id, current.reviewer_audio_file_name), reviewer_note: current.reviewer_note };
          current = { ...current, reviewer_note: null, reviewer_audio_drive_file_id: null, reviewer_audio_file_version_id: null, reviewer_audio_file_name: null, reviewer_audio_mime_type: null, reviewer_audio_file_size_bytes: null, is_reviewer_note_hidden: true, hidden_by: reviewer, hidden_at: now() };
        } else {
          current = { ...current, ...privateReview, is_reviewer_note_hidden: false, hidden_by: null, hidden_at: null };
        }
        return respond(current);
      }
      if (url.pathname === '/api/assignment-submissions/withdraw') {
        current = { ...current, status: 'pending', approved_at: null, approved_by: null, updated_at: now() };
        return respond(current);
      }
      if (url.pathname === '/api/drive-file-token') {
        driveHits++;
        return respond({ error: 'legacy forbidden' }, 500);
      }
      return route.continue();
    }
    if (url.origin !== supabaseOrigin) return route.abort();
    if (url.pathname.includes('drive-manager')) {
      driveHits++;
      return respond({ error: 'Drive forbidden' }, 500);
    }
    if (url.pathname === '/functions/v1/assignment-review-upload') {
      reviewUploadCount++;
      assert.deepEqual(request.postDataBuffer(), wav);
      const metadata = JSON.parse(decodeURIComponent(request.headers()['x-upload-metadata']));
      assert.equal(metadata.submissionId, submissionId);
      assert.equal(metadata.fileName, `review-${reviewUploadCount}.wav`);
      assert.equal(metadata.mimeType, 'audio/wav');
      assert.equal(metadata.size, wav.length);
      assert.equal(metadata.status, 'approved');
      if (reviewUploadCount === 2) {
        history = [{ ...current, id: '61000000-0000-4000-8000-000000000058', source_submission_id: submissionId, file_version_id: submissionVersion, reviewer_note: null, reviewer_audio_drive_file_id: null, reviewer_audio_file_version_id: null, reviewer_audio_file_name: null, reviewer_audio_mime_type: null, reviewer_audio_file_size_bytes: null, archived_at: now(), archive_reason: 'resubmitted' }];
        privateHistory = [{ history_id: history[0].id, ...privateReview }];
      }
      visibleReview(reviewVersions[reviewUploadCount - 1], metadata.fileName);
      current.reviewer_note = metadata.reviewerNote;
      privateReview.reviewer_note = metadata.reviewerNote;
      return respond({ submission: current, fileVersionId: current.reviewer_audio_file_version_id, replayed: false }, 201);
    }
    if (url.pathname === '/functions/v1/assignment-review-file') {
      if (request.method() === 'POST') {
        reviewTicketCount++;
        const { fileId } = request.postDataJSON();
        assert.ok(reviewVersions.includes(fileId));
        return respond({ url: `${supabaseOrigin}/functions/v1/assignment-review-file?fileId=${fileId}&ticket=synthetic-${fileId}`, expiresAt: Date.now() + 60_000 });
      }
      reviewReadCount++;
      return route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': origin, 'cache-control': 'private, no-store', 'content-length': String(wav.length) }, body: wav });
    }
    if (url.pathname === '/functions/v1/assignment-file') {
      if (request.method() === 'POST') {
        const { fileId } = request.postDataJSON();
        assert.equal(fileId, submissionVersion);
        return respond({ url: `${supabaseOrigin}/functions/v1/assignment-file?fileId=${fileId}&ticket=synthetic`, expiresAt: Date.now() + 60_000 });
      }
      return route.fulfill({ status: 200, contentType: 'audio/wav', body: wav });
    }
    if (url.pathname === '/auth/v1/user') return respond(session.user);
    if (url.pathname.endsWith('/rpc/list_my_choirs')) return respond([{ choir_id: choir, member_id: reviewer, choir_name: '058 Choir', choir_slug: '058', member_is_active: true, is_current: true }]);
    if (url.pathname.endsWith('/rpc/current_choir_id')) return respond(choir);
    if (url.pathname.endsWith('/choir_member_roles')) {
      if (url.search.includes(`member_id=eq.${reviewer}`)) return respond([{ roles: { name: 'Şef' } }]);
      return respond([]);
    }
    const objectResponse = String(request.headers().accept ?? '').includes('application/vnd.pgrst.object');
    if (url.pathname.endsWith('/choir_members')) {
      if (url.search.includes(`id=eq.${reviewer}`)) return respond(objectResponse ? reviewerRow : [reviewerRow]);
      if (url.search.includes(`id=eq.${singer}`)) return respond(objectResponse ? singerRow : [singerRow]);
      return respond([reviewerRow, singerRow]);
    }
    if (url.pathname.endsWith('/assignments')) return respond(objectResponse ? assignment : [assignment]);
    if (url.pathname.endsWith('/assignment_targets')) return respond([{ member_id: singer, choir_members: { first_name: 'Target', last_name: 'Singer', voice_group: 'Soprano' } }]);
    if (url.pathname.endsWith('/assignment_submissions')) return respond([current]);
    if (url.pathname.endsWith('/assignment_submission_history')) return respond(history);
    if (url.pathname.endsWith('/assignment_submission_private_notes')) return respond(current.is_reviewer_note_hidden && privateReview ? [privateReview] : []);
    if (url.pathname.endsWith('/assignment_submission_private_history')) return respond(privateHistory);
    if (url.pathname.endsWith('/assignment_submission_audit_logs')) return respond([]);
    return respond([]);
  });

  await page.goto(`${origin}/odevler/${assignmentId}?mid=${singer}`);
  try {
    await page.getByText('Synthetic acceptance', { exact: true }).waitFor();
  } catch (error) {
    console.error(`browser bootstrap failed at ${page.url()}: ${(await page.locator('body').innerText()).slice(0, 1000)}`);
    throw error;
  }
  await page.getByRole('button', { name: 'Onayla' }).first().click();
  await page.locator('textarea[placeholder="Onay notunu yazın..."]').fill('first audio review');
  await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({ name: 'review-1.wav', mimeType: 'audio/wav', buffer: wav });
  await page.getByRole('button', { name: 'Onayla' }).last().click();
  await page.getByTitle('Değerlendirme görünür (gizlemek için tıkla)').waitFor();
  assert.equal(reviewUploadCount, 1);
  assert.equal(notifyCount, 1);

  await page.getByTitle('Değerlendirme görünür (gizlemek için tıkla)').click();
  await page.getByTitle('Değerlendirme gizli (göstermek için tıkla)').waitFor();
  await page.getByTitle('Değerlendirme gizli (göstermek için tıkla)').click();
  await page.getByTitle('Değerlendirme görünür (gizlemek için tıkla)').waitFor();
  assert.equal(hideCount, 2);

  await page.getByRole('button', { name: 'Beklemeye Geri Al' }).click();
  await page.getByRole('button', { name: 'Onayla' }).first().waitFor();
  await page.getByRole('button', { name: 'Onayla' }).first().click();
  await page.locator('textarea[placeholder="Onay notunu yazın..."]').fill('replacement audio review');
  await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({ name: 'review-2.wav', mimeType: 'audio/wav', buffer: wav });
  await page.getByRole('button', { name: 'Onayla' }).last().click();
  await page.getByText('review-2.wav', { exact: true }).waitFor();
  await page.getByText('Geçmiş Teslim #1', { exact: true }).waitFor();
  try {
    await page.getByText(/first audio review/).waitFor();
  } catch (error) {
    console.error(`private history render failed: ${(await page.locator('body').innerText()).slice(0, 2500)}\n${seen.filter((entry) => entry.includes('private_history')).join('\n')}`);
    throw error;
  }
  assert.ok(await page.locator('audio[src*="assignment-review-file"]').count() >= 2);
  assert.equal(reviewUploadCount, 2);
  assert.equal(notifyCount, 2);

  const audioSource = await page.locator('audio[src*="assignment-review-file"]').first().getAttribute('src');
  assert.ok(audioSource);
  const readStatus = await page.evaluate(async (url) => (await fetch(url)).status, audioSource);
  assert.equal(readStatus, 200);
  assert.ok(reviewTicketCount >= 2);
  assert.ok(reviewReadCount >= 1);

  await page.getByRole('button', { name: 'Beklemeye Geri Al' }).click();
  await page.getByRole('button', { name: 'Onayla' }).first().click();
  await page.locator('textarea[placeholder="Onay notunu yazın..."]').fill('note-only-review');
  await page.getByRole('button', { name: 'Onayla' }).last().click();
  await page.getByText('note-only-review', { exact: false }).waitFor();
  assert.equal(noteOnlyCount, 1);
  assert.equal(driveHits, 0, seen.join('\n'));
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'spike/058-browser-result.png', fullPage: true });
  console.log(`PASS production Chrome 412x915: attach/replace/hide/unhide/note-only/private-history, uploads=${reviewUploadCount}, notifications=${notifyCount}, tickets=${reviewTicketCount}, reads=${reviewReadCount}, zero Drive calls/errors`);
} finally {
  await browser.close();
}
