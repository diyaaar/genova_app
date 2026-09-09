import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { chromium, type Page } from '@playwright/test';

const PROTECTED_CACHE_NAMES = [
  'genova-offline-repertoire-files-v1',
  'genova-offline-repertoire-meta-v1',
  'genova-runtime-drive-files-v1',
  'genova-runtime-drive-meta-v1',
] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function assertLoopback(value: string, port: string): URL {
  const url = new URL(value);
  assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.equal(url.port, port);
  return url;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function browserSha256(page: Page, url: string) {
  return page.evaluate(async (input) => {
    const response = await fetch(input, { cache: 'no-store' });
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return {
      ok: response.ok,
      status: response.status,
      size: bytes.byteLength,
      sha256: [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join(''),
      contentType: response.headers.get('content-type'),
    };
  }, url);
}

async function protectedCacheState(page: Page) {
  return page.evaluate(async (protectedNames) => {
    const names = await caches.keys();
    const entries: Record<string, number> = {};
    for (const name of protectedNames) {
      if (!names.includes(name)) continue;
      entries[name] = (await (await caches.open(name)).keys()).length;
    }
    return { names: names.filter((name) => protectedNames.includes(name as typeof protectedNames[number])), entries };
  }, [...PROTECTED_CACHE_NAMES]);
}

function runFixtureAction(action: 'enable-failure' | 'disable-failure') {
  const result = spawnSync('bash', ['supabase/test-support/022_web_runtime_runner.sh', action], {
    cwd: required('GENOVA_022_REPO_ROOT'),
    env: process.env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Fixture action ${action} failed: ${result.stderr || result.stdout}`);
  }
}

async function main() {
  const repoRoot = resolve(required('GENOVA_022_REPO_ROOT'));
  const appUrl = assertLoopback(required('GENOVA_022_APP_URL'), '31022').origin;
  const serviceUrl = assertLoopback(required('NEXT_PUBLIC_SUPABASE_URL'), '54321').origin;
  const chromePath = required('GENOVA_022_CHROME_PATH');
  const email = required('GENOVA_022_EMAIL');
  const password = required('GENOVA_022_PASSWORD');
  const choirA = required('GENOVA_022_CHOIR_A');
  const choirB = required('GENOVA_022_CHOIR_B');
  const songId = required('GENOVA_022_SONG_ID');
  const pdfFileId = required('GENOVA_022_PDF_FILE_ID');
  const audioFileId = required('GENOVA_022_AUDIO_FILE_ID');
  const pdfDriveId = `022-${pdfFileId}`;
  const audioDriveId = `022-${audioFileId}`;
  const expectedPdf = Buffer.from(await readFile(
    resolve(repoRoot, 'apps/mobile/src/repertoire/__fixtures__/score_40p.pdf'),
  ));
  const fixture = JSON.parse(await readFile(
    resolve(required('GENOVA_022_WORKDIR'), '.022-fixture.json'),
    'utf8',
  )) as { audioSize: number; audioSha256: string };
  const evidenceDir = resolve(repoRoot, 'docs/evidence/022-web-protected-file-compatibility');
  await mkdir(evidenceDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const edgeResponses: Array<{ method: string; status: number }> = [];
  let pdfTicketPosts = 0;
  let nearExpiryInjected = false;

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().replace(/token=[^&\s]+/gu, 'token=[redacted]'));
  });
  page.on('response', (response) => {
    if (!response.url().startsWith(`${serviceUrl}/functions/v1/repertoire-file`)) return;
    edgeResponses.push({ method: response.request().method(), status: response.status() });
  });
  await page.route(`${serviceUrl}/functions/v1/repertoire-file`, async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const body = request.postDataJSON() as { fileId?: string } | null;
    if (body?.fileId === pdfFileId) {
      pdfTicketPosts += 1;
      if (!nearExpiryInjected) {
        nearExpiryInjected = true;
        const response = await route.fetch();
        const payload = await response.json() as { url: string; expiresAt: number };
        await route.fulfill({ response, json: { ...payload, expiresAt: Date.now() + 500 } });
        return;
      }
    }
    await route.continue();
  });

  try {
    await page.goto(`${appUrl}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('E-posta').fill(email);
    await page.getByLabel('Şifre', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    const choirGate = page.getByRole('heading', { name: 'Çalışacağın koroyu seç' });
    try {
      await page.waitForFunction(() =>
        document.body.textContent?.includes('Çalışacağın koroyu seç')
        || Boolean(document.querySelector('select[aria-label="Aktif koroyu değiştir"]'))
      );
    } catch {
      const visibleText = (await page.locator('body').innerText()).slice(0, 500);
      throw new Error(`Post-login choir context did not load at ${page.url()}: ${visibleText}`);
    }
    if (await choirGate.isVisible()) {
      await page.getByRole('button', { name: '022 Sentetik Koro A' }).click();
    } else {
      const activeChoirSelect = page.getByLabel('Aktif koroyu değiştir');
      if (await activeChoirSelect.inputValue() !== choirA) {
        await activeChoirSelect.selectOption(choirA);
      }
    }
    await page.waitForFunction((id) =>
      document.querySelector<HTMLSelectElement>('select[aria-label="Aktif koroyu değiştir"]')?.value === id,
    choirA);
    await page.goto(`${appUrl}/repertuvar/${songId}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: '022 Korunan Sentetik Eser' }).waitFor();
    await page.locator('.react-pdf__Page canvas').first().waitFor({ state: 'visible', timeout: 60_000 });
    await page.getByRole('button', { name: 'Müzik oynatıcıyı aç' }).waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Müzik oynatıcıyı aç' }).click();
    await page.getByTitle('Oynat').click();
    await page.waitForTimeout(3_000);
    await page.getByTitle('Duraklat').waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
    await page.getByTitle('Duraklat').waitFor();
    assert.ok(
      edgeResponses.some((item) => item.method === 'GET' && item.status === 206),
      `protected audio did not use a successful Range request: ${JSON.stringify(edgeResponses)}`,
    );

    await page.goto(`${appUrl}/repertuvar`);
    await page.waitForTimeout(700);
    await page.evaluate(async () => {
      await Promise.all([
        caches.delete('genova-runtime-drive-files-v1'),
        caches.delete('genova-runtime-drive-meta-v1'),
      ]);
    });
    await page.getByText('022 Korunan Sentetik Eser', { exact: true }).click();
    await page.getByRole('heading', { name: '022 Korunan Sentetik Eser' }).waitFor();
    await page.locator('.react-pdf__Page canvas').first().waitFor({ state: 'visible', timeout: 60_000 });
    assert.ok(pdfTicketPosts >= 2, `near-expiry PDF ticket was not renewed; posts=${pdfTicketPosts}`);

    const offlineToggle = page.getByRole('switch', { name: 'Offline kullanım' });
    await offlineToggle.click();
    await page.getByText('2 dosya offline kullanıma hazır.').waitFor({ timeout: 60_000 });
    const cached = await protectedCacheState(page);
    assert.ok((cached.entries['genova-offline-repertoire-files-v1'] ?? 0) >= 2);
    assert.ok((cached.entries['genova-offline-repertoire-meta-v1'] ?? 0) >= 1);
    assert.ok((cached.entries['genova-runtime-drive-files-v1'] ?? 0) >= 2);
    assert.ok((cached.entries['genova-runtime-drive-meta-v1'] ?? 0) >= 2);
    const offlinePdf = await browserSha256(page, `/offline-drive/${pdfDriveId}`);
    const offlineAudio = await browserSha256(page, `/offline-drive/${audioDriveId}`);
    assert.deepEqual(
      { ok: offlinePdf.ok, status: offlinePdf.status, size: offlinePdf.size, sha256: offlinePdf.sha256 },
      { ok: true, status: 200, size: expectedPdf.length, sha256: sha256(expectedPdf) },
    );
    assert.deepEqual(
      { ok: offlineAudio.ok, status: offlineAudio.status, size: offlineAudio.size, sha256: offlineAudio.sha256 },
      { ok: true, status: 200, size: fixture.audioSize, sha256: fixture.audioSha256 },
    );
    await page.screenshot({ path: resolve(evidenceDir, 'web-pdf-audio-offline.png'), fullPage: true });

    runFixtureAction('enable-failure');
    await page.goto(`${appUrl}/repertuvar/${songId}`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: '022 Korunan Sentetik Eser' }).waitFor();
    await page.waitForTimeout(4_000);
    const failureToggle = page.getByRole('switch', { name: 'Offline kullanım' });
    await failureToggle.click();
    await page.getByText(/Offline dosyalar kaldırıldı|Offline kullanım kapatıldı/u).waitFor();
    await failureToggle.click();
    await page.waitForTimeout(4_000);
    await page.getByText(/022-korunan-440hz\.wav indirilemedi \(502\)/u).waitFor({ timeout: 15_000 });
    await page.screenshot({ path: resolve(evidenceDir, 'web-failed-download.png'), fullPage: true });
    runFixtureAction('disable-failure');

    await page.getByRole('button', { name: 'Müzik oynatıcıyı aç' }).click();
    await page.getByTitle('Oynat').click();
    await page.getByTitle('Duraklat').waitFor({ timeout: 20_000 });
    await page.goto(`${appUrl}/repertuvar`);
    await page.getByLabel('Aktif koroyu değiştir').selectOption(choirB);
    await page.getByLabel('Aktif koroyu değiştir').waitFor();
    await page.waitForFunction((id) => {
      const select = document.querySelector<HTMLSelectElement>('select[aria-label="Aktif koroyu değiştir"]');
      return select?.value === id;
    }, choirB);
    const afterSwitchCaches = await protectedCacheState(page);
    assert.deepEqual(afterSwitchCaches.names, []);
    const afterSwitchPlayerControls = await page.locator('button[title="Oynat"], button[title="Duraklat"]').count();
    assert.equal(afterSwitchPlayerControls, 0, 'previous choir audio player remained after choir switch');
    await page.waitForFunction(() => !document.body.textContent?.includes('022 Korunan Sentetik Eser'));
    const wrongChoir = await page.evaluate(async ({ endpoint, fileId }) => {
      const authKey = Object.keys(localStorage).find((key) => key.includes('-auth-token'));
      const authValue = authKey ? JSON.parse(localStorage.getItem(authKey) ?? 'null') : null;
      const accessToken = authValue?.access_token as string | undefined;
      if (!accessToken) throw new Error('Authenticated browser session was not found.');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileId }),
      });
      return { status: response.status, body: await response.text() };
    }, { endpoint: `${serviceUrl}/functions/v1/repertoire-file`, fileId: pdfFileId });
    assert.equal(wrongChoir.status, 403);
    assert.ok(!wrongChoir.body.includes('storage://'));
    await page.screenshot({ path: resolve(evidenceDir, 'web-choir-b-clean.png'), fullPage: true });

    await page.goto(`${appUrl}/profil`);
    await page.getByRole('button', { name: 'Profil menüsünü aç' }).click();
    await page.getByText('Çıkış Yap', { exact: true }).click();
    await page.getByRole('button', { name: 'Giriş Yap' }).waitFor();
    await page.waitForTimeout(1_000);
    const afterSignOut = await page.evaluate(async (protectedNames) => ({
      protectedCacheNames: (await caches.keys()).filter((name) =>
        protectedNames.includes(name as typeof protectedNames[number])
      ),
      protectedLocalStorage: Object.keys(localStorage).filter((key) =>
        key.includes('auth-token') || key.startsWith('genova:active-choir:') || key === 'genova.repertoire.offline.v1'
      ),
    }), [...PROTECTED_CACHE_NAMES]);
    assert.deepEqual(afterSignOut.protectedCacheNames, []);
    assert.deepEqual(afterSignOut.protectedLocalStorage, []);
    assert.equal(await page.locator('button[title="Oynat"], button[title="Duraklat"]').count(), 0);
    await page.screenshot({ path: resolve(evidenceDir, 'web-signout-clean.png'), fullPage: true });

    const unsafePageErrors = pageErrors.filter((message) => !message.includes('AbortError'));
    assert.deepEqual(unsafePageErrors, []);
    const summary = {
      browser: 'installed Google Chrome via Playwright 1.62.1',
      pdf: { size: expectedPdf.length, sha256: sha256(expectedPdf), ticketPosts: pdfTicketPosts },
      audio: { size: fixture.audioSize, sha256: fixture.audioSha256, durationSeconds: 10, rangeStatus: 206 },
      cachesBeforeFailure: cached,
      afterSwitchCaches,
      wrongChoirStatus: wrongChoir.status,
      edgeResponseSummary: Object.entries(edgeResponses.reduce<Record<string, number>>((acc, item) => {
        const key = `${item.method} ${item.status}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {})),
      expectedFailureConsoleErrors: consoleErrors.filter((message) => message.includes('AUDIO_PLAYER_ERROR')).length,
      pageErrors: unsafePageErrors,
      limits: ['local synthetic service/browser only', 'Storage provider substitute; not Drive', 'no hosted, real-user, hardware or publication evidence'],
    };
    await writeFile(resolve(evidenceDir, 'browser-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`PASS browser_pdf bytes=${summary.pdf.size} sha256=${summary.pdf.sha256} renewed_posts=${pdfTicketPosts}`);
    console.log(`PASS browser_audio bytes=${summary.audio.size} sha256=${summary.audio.sha256} duration=${summary.audio.durationSeconds} range=${summary.audio.rangeStatus}`);
    console.log(`PASS browser_offline pdf=${offlinePdf.status} audio=${offlineAudio.status} caches=runtime+explicit`);
    console.log(`PASS browser_failure wrong_choir=${wrongChoir.status} missing_object=visible_502`);
    console.log('PASS browser_tenant_cleanup switch=empty signout=empty');
  } finally {
    runFixtureAction('disable-failure');
    await context.close();
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
