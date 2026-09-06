import { expect, test } from '@playwright/test';

test('invalid invitation shows recovery guidance',async({page})=>{
  await page.goto('/invite');
  await expect(page.locator('main [role="alert"]')).toContainText('Davet bağlantısı eksik');
  await expect(page.getByRole('button',{name:'Daveti kabul et'})).toHaveCount(0);
});

test('new-account path keeps the invite and explains email verification',async({page})=>{
  await page.route('**/auth/v1/signup',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:'test-user',email:'ada@example.invalid'},session:null})}));
  const token='a'.repeat(64);
  await page.goto('/invite#invite='+token);
  await page.getByRole('button',{name:'Hesabım yok, kayıt ol'}).click();
  await page.getByLabel('E-posta',{exact:true}).fill('ada@example.invalid');
  await page.getByLabel('Şifre',{exact:true}).fill('test-only-password-008');
  await page.getByRole('button',{name:'Hesap oluştur',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Doğrulama e-postanızı kontrol edin');
  expect(new URL(page.url()).hash).toBe('#invite='+token);
});
