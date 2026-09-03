import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
