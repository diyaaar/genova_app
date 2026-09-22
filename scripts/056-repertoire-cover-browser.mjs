import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const origin='http://127.0.0.1:4174',supabaseOrigin='https://example.supabase.co';
const choir='20000000-0000-4000-8000-000000000056',member='30000000-0000-4000-8000-000000000056';
const user='10000000-0000-4000-8000-000000000056',songId='50000000-0000-4000-8000-000000000056';
const expires=Math.floor(Date.now()/1000)+3600,token=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:user,session_id:'70000000-0000-4000-8000-000000000056',exp:expires,role:'authenticated',aud:'authenticated'})).toString('base64url')}.synthetic`;
const session={access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_in:3600,expires_at:expires,user:{id:user,aud:'authenticated',role:'authenticated',email:'056@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-09-22T00:00:00Z'}};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const song={id:songId,choir_id:choir,title:'056 Cover Score',composer:'Synthetic',drive_folder_id:null,is_visible:true,created_at:'2026-09-22T00:00:00Z'};
const score={id:'60000000-0000-4000-8000-000000000050',song_id:songId,choir_id:choir,file_name:'score.pdf',file_type:'sheet',partition_label:null,drive_file_id:'r2_score',drive_web_view_link:null,drive_download_link:null,mime_type:'application/pdf',file_size_bytes:69,uploaded_by:member,created_at:'2026-09-22T00:00:00Z',updated_at:'2026-09-22T00:00:00Z'};
let cover=null,uploadCount=0,lifecycleCount=0,ticketCount=0,contentCount=0,driveHits=0;const errors=[];
const coverFile=(id,name)=>({id,song_id:songId,choir_id:choir,file_name:name,file_type:'other',partition_label:'__cover__',drive_file_id:`r2_${id}`,drive_web_view_link:null,drive_download_link:null,mime_type:'image/png',file_size_bytes:png.length,uploaded_by:member,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const context=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'block'});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await context.addInitScript(stored=>localStorage.setItem('sb-example-auth-token',JSON.stringify(stored)),session);
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());const respond=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(url.origin===origin){if(url.pathname==='/api/drive-file-token'){driveHits++;return respond({error:'legacy path forbidden'},500)}return route.continue()}
  if(url.origin!==supabaseOrigin)return route.abort();
  if(url.pathname.includes('drive-manager')){driveHits++;return respond({error:'Drive forbidden'},500)}
  if(url.pathname==='/functions/v1/repertoire-upload'){uploadCount++;assert.deepEqual(request.postDataBuffer(),png);const metadata=JSON.parse(decodeURIComponent(request.headers()['x-upload-metadata']));assert.deepEqual(metadata,{songId,fileName:`cover-${uploadCount}.png`,fileType:'other',mimeType:'image/png',size:png.length,partitionLabel:'__cover__'});cover=coverFile(`60000000-0000-4000-8000-00000000005${uploadCount+5}`,metadata.fileName);return respond({file:cover},201)}
  if(url.pathname==='/functions/v1/repertoire-file-lifecycle'){lifecycleCount++;const body=request.postDataJSON();assert.equal(body.targetType,'file');assert.equal(body.mode,'delete');if(cover?.id===body.targetId)cover=null;return respond({deleted:true,cleanupPending:false})}
  if(url.pathname==='/functions/v1/repertoire-file'){
    if(request.method()==='POST'){ticketCount++;const {fileId}=request.postDataJSON();assert.equal(fileId,cover.id);return respond({url:`?fileId=${fileId}&ticket=synthetic-cover`,expiresAt:Date.now()+60000})}
    contentCount++;return route.fulfill({status:200,contentType:'image/png',headers:{'cache-control':'private, no-store','content-length':String(png.length)},body:png})
  }
  if(url.pathname==='/auth/v1/user')return respond(session.user);
  if(url.pathname.endsWith('/rpc/list_my_choirs'))return respond([{choir_id:choir,member_id:member,choir_name:'056 Choir',choir_slug:'056',member_is_active:true,is_current:true}]);
  if(url.pathname.endsWith('/rpc/current_choir_id'))return respond(choir);
  if(url.pathname.endsWith('/choir_members'))return respond({id:member,choir_id:choir,auth_user_id:user,first_name:'Synthetic',last_name:'Manager',is_active:true,voice_group:'Şef',join_date:'2026-01-01',email:'056@example.invalid'});
  if(url.pathname.endsWith('/choir_member_roles'))return respond([{roles:{name:'Şef'}}]);
  if(url.pathname.endsWith('/repertoire_cache_versions'))return respond({version:uploadCount+1,updated_at:null});
  if(url.pathname.endsWith('/repertoire_tags')||url.pathname.endsWith('/song_assignments'))return respond([]);
  if(url.pathname.endsWith('/repertoire')){const value={...song,repertoire_files:cover?[score,cover]:[score],repertoire_song_tags:[]};if(url.searchParams.has('id'))return respond(value);return respond([value])}
  return respond([]);
 });
 await page.goto(`${origin}/repertuvar`);await page.getByText(song.title,{exact:true}).waitFor();await page.getByTitle('Düzenle',{exact:true}).click();
 const input=page.locator('input[accept^="image/"]');await input.setInputFiles({name:'cover-1.png',mimeType:'image/png',buffer:png});await page.getByText('Kapak görseli yüklendi.',{exact:true}).waitFor();await page.getByText('cover-1.png',{exact:true}).waitFor();
 await input.setInputFiles({name:'cover-2.png',mimeType:'image/png',buffer:png});await page.getByText('Kapak görseli güncellendi.',{exact:true}).waitFor();await page.getByText('cover-2.png',{exact:true}).waitFor();
 await page.getByTitle('Kapak Sil',{exact:true}).click();const confirm=page.getByText('Sil?',{exact:true}).locator('..');await confirm.getByRole('button').first().click();await page.getByText('Kapak görseli silindi.',{exact:true}).waitFor();
 assert.equal(uploadCount,2);assert.equal(lifecycleCount,2);assert.ok(ticketCount>=2);assert.ok(contentCount>=1);assert.equal(driveHits,0);assert.deepEqual(errors,[]);await page.screenshot({path:'spike/056-browser-result.png',fullPage:true});
 console.log(`PASS production Chrome 412x915: private cover add/replace/delete, tickets=${ticketCount}, content=${contentCount}, zero Drive calls/errors`);
}finally{await browser.close()}
