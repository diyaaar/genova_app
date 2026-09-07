import { expect, test } from '@playwright/test';

const TOKEN = 'a'.repeat(64);

test('invalid invitation shows recovery guidance',async({page})=>{
  await page.goto('/invite');
  await expect(page.locator('main [role="alert"]')).toContainText('Davet bağlantısı eksik');
  await expect(page.getByRole('button',{name:'Daveti kabul et'})).toHaveCount(0);
});

test('new-account path keeps the invite and explains email verification',async({page})=>{
  let signupUrl:string|null=null;
  // The glob has to tolerate a query string: the page asks the provider to send
  // the reader back to /invite, and that arrives as ?redirect_to=... on this call.
  await page.route('**/auth/v1/signup*',route=>{
    signupUrl=route.request().url();
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:'test-user',email:'ada@example.invalid'},session:null})});
  });
  await page.goto('/invite#invite='+TOKEN);
  await page.getByRole('button',{name:'Hesabım yok, kayıt ol'}).click();
  await page.getByLabel('E-posta',{exact:true}).fill('ada@example.invalid');
  await page.getByLabel('Şifre',{exact:true}).fill('test-only-password-008');
  await page.getByRole('button',{name:'Hesap oluştur',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Doğrulama e-postanızı kontrol edin');
  expect(new URL(page.url()).hash).toBe('#invite='+TOKEN);

  // Without this the provider returns to the site root, where a member with no
  // choir is stopped by the membership gate and the invitation is lost.
  const redirectTo=new URL(signupUrl!).searchParams.get('redirect_to');
  expect(redirectTo).toBe(new URL('/invite',page.url()).toString());
  // The raw token must never travel in a query string.
  expect(signupUrl!).not.toContain(TOKEN);
});

test('the invitation survives a return that carries no fragment',async({page})=>{
  await page.goto('/invite#invite='+TOKEN);
  // Waiting for the form proves the page hydrated, so the absent alert means something.
  await expect(page.getByRole('button',{name:'Hesabım yok, kayıt ol'})).toBeVisible();
  await expect(page.locator('main [role="alert"]')).toHaveCount(0);

  // This is the shape of the email-verification return: same page, no fragment.
  await page.goto('/invite');
  await expect(page.getByRole('button',{name:'Hesabım yok, kayıt ol'})).toBeVisible();
  await expect(page.locator('main [role="alert"]')).toHaveCount(0);
});

test('a stale or foreign stored value is ignored rather than trusted',async({page})=>{
  await page.addInitScript(()=>{
    window.localStorage.setItem('genova.invite.pending','{"token":"nope","expiresAt":99999999999999}');
  });
  await page.goto('/invite');
  await expect(page.locator('main [role="alert"]')).toContainText('Davet bağlantısı eksik');
});

test('password recovery can be requested from the recovery page itself',async({page})=>{
  let recoverUrl:string|null=null;
  await page.route('**/auth/v1/recover*',route=>{
    recoverUrl=route.request().url();
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });

  await page.goto('/auth/recovery');
  await expect(page.getByRole('heading',{name:'Şifre sıfırlama'})).toBeVisible();
  await page.getByLabel('E-posta',{exact:true}).fill('ada@example.invalid');
  await page.getByRole('button',{name:'Sıfırlama bağlantısı gönder'}).click();

  // One answer for every address, so the form cannot be used to probe accounts.
  await expect(page.getByRole('status')).toContainText('Bu adres kayıtlıysa');
  const redirectTo=new URL(recoverUrl!).searchParams.get('redirect_to');
  expect(redirectTo).toBe(new URL('/auth/recovery?recovery=1',page.url()).toString());
});

test('the recovery request refuses an undeliverable address before any call',async({page})=>{
  let called=false;
  await page.route('**/auth/v1/recover*',route=>{called=true;return route.fulfill({status:200,contentType:'application/json',body:'{}'});});
  await page.goto('/auth/recovery');
  await page.getByLabel('E-posta',{exact:true}).fill('ada@example');
  await page.getByRole('button',{name:'Sıfırlama bağlantısı gönder'}).click();
  // Scoped to main: Next renders its own role="alert" route announcer in the body.
  await expect(page.locator('main [role="alert"]')).toContainText('Geçerli bir e-posta adresi yazın.');
  expect(called).toBe(false);
});
