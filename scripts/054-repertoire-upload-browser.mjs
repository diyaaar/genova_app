// Run against the already-built synthetic 054 candidate on loopback; never starts a build.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = 'http://127.0.0.1:4174';
const choir = '20000000-0000-4000-8000-000000000054';
const member = '30000000-0000-4000-8000-000000000054';
const user = '10000000-0000-4000-8000-000000000054';
const expires = Math.floor(Date.now()/1000)+3600;
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub:user,session_id:'70000000-0000-4000-8000-000000000054',exp:expires,role:'authenticated',aud:'authenticated' })).toString('base64url')}.synthetic`;
const session = { access_token:token,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,expires_at:expires,
  user:{ id:user,aud:'authenticated',role:'authenticated',email:'054@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-09-21T00:00:00Z' } };
const pdf = Buffer.from('%PDF-1.4\nsynthetic browser fixture\n%%EOF');
const browser = await chromium.launch({ channel:'chrome',headless:true });
let song = null, file = null, inserts = 0, uploads = 0, driveHits = 0;
const retryKeys = [], errors = [];
try {
  const context = await browser.newContext({ viewport:{ width:412,height:915 }, serviceWorkers:'block' });
  const page = await context.newPage();
  page.on('pageerror',error => errors.push(error.message));
  await context.addInitScript(stored => localStorage.setItem('sb-example-auth-token',JSON.stringify(stored)),session);
  await context.route('**/*',async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.origin !== 'https://example.supabase.co') return route.abort();
    const respond = (value,status=200) => route.fulfill({ status,contentType:'application/json',body:JSON.stringify(value) });
    if (url.pathname.includes('drive-manager')) { driveHits++;return respond({ error:'Forbidden fixture path' },500); }
    if (url.pathname === '/functions/v1/repertoire-upload') {
      uploads++;
      const request = route.request();
      assert.equal(request.headers().authorization,`Bearer ${token}`);
      assert.deepEqual(request.postDataBuffer(),pdf);
      const metadata = JSON.parse(decodeURIComponent(request.headers()['x-upload-metadata']));
      assert.equal(metadata.songId,song.id);
      assert.equal(metadata.size,pdf.length);
      assert.deepEqual(Object.keys(metadata).sort(),['fileName','fileType','mimeType','partitionLabel','size','songId']);
      retryKeys.push(request.headers()['idempotency-key']);
      if (uploads === 1) return respond({ error:'upload-failed' },502);
      file = { id:'40000000-0000-4000-8000-000000000054',song_id:song.id,choir_id:choir,file_name:'score.pdf',
        file_type:'sheet',mime_type:'application/pdf',partition_label:null,drive_file_id:'r2_054',drive_download_link:null,
        drive_web_view_link:null,file_size_bytes:pdf.length,created_at:'2026-09-21T00:00:00Z',updated_at:'2026-09-21T00:00:00Z',uploaded_by:member };
      return respond({ file },201);
    }
    if (url.pathname === '/auth/v1/user') return respond(session.user);
    if (url.pathname.endsWith('/rpc/list_my_choirs')) return respond([{ choir_id:choir,member_id:member,
      choir_name:'054 Choir',choir_slug:'054',member_is_active:true,is_current:true }]);
    if (url.pathname.endsWith('/rpc/current_choir_id')) return respond(choir);
    if (url.pathname.endsWith('/choir_members')) return respond({ id:member,choir_id:choir,auth_user_id:user,
      first_name:'Synthetic',last_name:'Manager',is_active:true,voice_group:'Şef',join_date:'2026-01-01',email:'054@example.invalid' });
    if (url.pathname.endsWith('/choir_member_roles')) return respond([{ roles:{ name:'Şef' } }]);
    if (url.pathname.endsWith('/repertoire_cache_versions')) return respond({ version:file ? 2 : 1,updated_at:null });
    if (url.pathname.endsWith('/repertoire')) {
      if (route.request().method() === 'POST') {
        inserts++;song = { ...route.request().postDataJSON(),drive_folder_id:null,created_at:'2026-09-21T00:00:00Z' };
        return route.fulfill({ status:201,body:'' });
      }
      if (url.searchParams.has('id')) return respond(song);
      return respond(song ? [{ ...song,repertoire_files:file ? [file] : [],repertoire_song_tags:[] }] : []);
    }
    return respond([]);
  });
  await page.goto(`${origin}/repertuvar`);
  await page.getByTitle('Şarkı Ekle',{ exact:true }).click();
  await page.getByLabel('Şarkı Adı *',{ exact:true }).fill('054 Browser Score');
  await page.getByLabel('Besteci',{ exact:true }).fill('Synthetic');
  await page.getByLabel('İlk PDF veya ses dosyası *').setInputFiles({ name:'score.pdf',mimeType:'application/pdf',buffer:pdf });
  await page.locator('button[form="add-song-form"]').click();
  await page.getByText('Dosya yüklenemedi. Aynı dosyayla tekrar deneyin.',{ exact:true }).waitFor();
  assert.equal(inserts,1);
  await page.reload();
  await page.getByTitle('Şarkı Ekle',{ exact:true }).click();
  await page.getByText('Bekleyen yüklemeyi tamamlamak için score.pdf dosyasını yeniden seçin.').waitFor();
  await page.getByLabel('İlk PDF veya ses dosyası *').setInputFiles({ name:'score.pdf',mimeType:'application/pdf',buffer:pdf });
  await page.locator('button[form="add-song-form"]').click();
  await page.getByText('Şarkı eklendi!',{ exact:true }).waitFor();
  await page.getByRole('button',{ name:'Tamam',exact:true }).click();
  await page.getByRole('button',{ name:'Tamam',exact:true }).waitFor({ state:'hidden' });
  await page.getByText('054 Browser Score',{ exact:true }).waitFor();
  assert.equal(inserts,1);assert.equal(uploads,2);assert.equal(retryKeys[0],retryKeys[1]);assert.equal(driveHits,0);
  assert.deepEqual(errors,[]);
  await page.screenshot({ path:'spike/054-browser-result.png',fullPage:true });
  console.log('PASS production Chrome at 412x915: new song, failed upload, reload/resume same IDs, private-only catalogue, zero Drive calls, zero page errors');
} finally { await browser.close(); }
