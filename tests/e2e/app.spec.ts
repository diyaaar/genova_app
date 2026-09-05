import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const choirA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const choirB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const memberA = '11111111-1111-4111-8111-111111111111';
const memberB = '22222222-2222-4222-8222-222222222222';

function createTestSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const userId = '33333333-3333-4333-8333-333333333333';
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    session_id: '44444444-4444-4444-8444-444444444444',
    exp: expiresAt,
  })).toString('base64url');
  const accessToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`;

  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: 'test-refresh-token',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'multi@example.invalid',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

test('login page exposes labelled controls and a working password visibility toggle', async ({ page }) => {
  await page.goto('/login');

  const email = page.getByLabel('E-posta');
  const password = page.getByLabel('Şifre', { exact: true });
  const toggle = page.getByRole('button', { name: 'Şifreyi göster' });

  await expect(email).toBeVisible();
  await expect(password).toHaveAttribute('type', 'password');
  await toggle.click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Şifreyi gizle' })).toBeVisible();
});

test('anonymous users are redirected away from protected app routes', async ({ page }) => {
  await page.goto('/repertuvar');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Hoş Geldiniz' })).toBeVisible();
});

test('invalid login errors remain understandable to users', async ({ page }) => {
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'invalid_credentials', message: 'Invalid login credentials' }),
    });
  });
  await page.goto('/login');

  await page.getByLabel('E-posta').fill('invalid@example.com');
  await page.getByLabel('Şifre', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await expect(page.getByText('E-posta veya şifre hatalı.')).toBeVisible();
});

test('login has no serious or critical automated accessibility violations', async ({ page }) => {
  await page.goto('/login');

  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));

  expect(blocking).toEqual([]);
});

test('PWA manifest, icons and service worker are served', async ({ page, request }) => {
  await page.goto('/login');

  const manifestResponse = await request.get('/manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json() as { start_url?: string; icons?: Array<{ src?: string }> };
  expect(manifest.start_url).toBe('/');
  expect(manifest.icons?.map((icon) => icon.src)).toEqual(expect.arrayContaining([
    '/icon-192.png',
    '/icon-512.png',
    '/icon-maskable-512.png',
  ]));

  for (const asset of ['/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/sw.js']) {
    const response = await request.get(asset);
    expect(response.ok(), asset).toBe(true);
  }
});

test('a multi-membership session stays closed until a choir is selected, then opens only that choir', async ({ page }) => {
  const session = createTestSession();
  let selectedChoirId: string | null = null;

  await page.addInitScript((storedSession) => {
    window.localStorage.setItem('sb-example-auth-token', JSON.stringify(storedSession));
  }, session);

  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/rpc/list_my_choirs')) {
      const memberships = [
        {
          choir_id: choirA,
          member_id: memberA,
          choir_name: 'Genova A',
          choir_slug: 'genova-a',
          member_is_active: true,
          is_current: selectedChoirId === choirA,
        },
        {
          choir_id: choirB,
          member_id: memberB,
          choir_name: 'Genova B',
          choir_slug: 'genova-b',
          member_is_active: true,
          is_current: selectedChoirId === choirB,
        },
      ];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(memberships) });
      return;
    }

    if (url.pathname.endsWith('/rpc/set_active_choir')) {
      const body = route.request().postDataJSON() as { p_choir_id?: string };
      selectedChoirId = body.p_choir_id ?? null;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(selectedChoirId) });
      return;
    }

    if (url.pathname.endsWith('/choir_members') && url.searchParams.has('id')) {
      const member = {
        id: memberB,
        choir_id: choirB,
        first_name: 'Ada',
        last_name: 'Korist',
        voice_group: 'Alto',
        sub_voice_group: null,
        auth_user_id: session.user.id,
        email: session.user.email,
        phone: null,
        is_active: true,
        photo_url: null,
        birth_date: null,
        join_date: '2026-01-01',
        school_id: null,
        department_id: null,
        favorite_song_id: null,
        about_text: null,
        linkedin_url: null,
        instagram_url: null,
        youtube_url: null,
        spotify_url: null,
        tiktok_url: null,
        x_url: null,
        schools: null,
        departments: null,
        repertoire: null,
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(member) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Çalışacağın koroyu seç' })).toBeVisible();
  await expect(page.getByText('Hoş Geldin, Ada')).toHaveCount(0);
  const gateAccessibility = await new AxeBuilder({ page }).analyze();
  expect(gateAccessibility.violations.filter(
    (violation) => ['serious', 'critical'].includes(violation.impact ?? ''),
  )).toEqual([]);

  await page.getByRole('button', { name: 'Genova B' }).click();

  await expect(page.getByText('Hoş Geldin, Ada')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Aktif koroyu değiştir' })).toHaveValue(choirB);
  expect(selectedChoirId).toBe(choirB);
});
