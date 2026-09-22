// Run against an already-built loopback candidate. All data/provider responses are synthetic.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const origin='http://127.0.0.1:4174',choir='20000000-0000-4000-8000-000000000055';
const member='30000000-0000-4000-8000-000000000055',user='10000000-0000-4000-8000-000000000055';
const songId='50000000-0000-4000-8000-000000000055',oldId='60000000-0000-4000-8000-000000000055',newId='60000000-0000-4000-8000-000000000056';
const expires=Math.floor(Date.now()/1000)+3600,token=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:user,session_id:'70000000-0000-4000-8000-000000000055',exp:expires,role:'authenticated',aud:'authenticated'})).toString('base64url')}.synthetic`;
const session={access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_in:3600,expires_at:expires,user:{id:user,aud:'authenticated',role:'authenticated',email:'055@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-09-22T00:00:00Z'}};
const pdf=Buffer.from('%PDF-1.4\n055 replacement\n%%EOF');
const makeFile=(id,name)=>({id,song_id:songId,choir_id:choir,file_name:name,file_type:'sheet',partition_label:null,drive_file_id:`r2_${id}`,drive_web_view_link:null,drive_download_link:null,mime_type:'application/pdf',file_size_bytes:pdf.length,uploaded_by:member,created_at:'2026-09-22T00:00:00Z',updated_at:'2026-09-22T00:00:00Z'});
const song={id:songId,choir_id:choir,title:'055 Lifecycle Score',composer:'Synthetic',drive_folder_id:null,is_visible:true,created_at:'2026-09-22T00:00:00Z'};
let activeFile=makeFile(oldId,'old.pdf'),annotated=true,uploads=0,lifecycle=0,driveHits=0;const errors=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const context=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'block'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(stored=>localStorage.setItem('sb-example-auth-token',JSON.stringify(stored)),session);
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin===origin)return route.continue();if(url.origin!=='https://example.supabase.co')return route.abort();const respond=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(url.pathname.includes('drive-manager')){driveHits++;return respond({error:'forbidden'},500)}
  if(url.pathname==='/functions/v1/repertoire-file-lifecycle'){lifecycle++;const request=route.request();assert.equal(request.headers().authorization,`Bearer ${token}`);const body=request.postDataJSON();assert.equal(body.targetType,'file');
   if(request.method()==='POST'){assert.equal(body.mode,'replacement');if(annotated)return respond({error:'annotated-pdf'},409);return respond({ready:true});}
   assert.equal(request.method(),'DELETE');if(body.mode==='replacement'){assert.equal(body.targetId,oldId);activeFile=makeFile(newId,'new.pdf');return respond({deleted:true,cleanupPending:false});}
   assert.equal(body.targetId,newId);activeFile=null;return respond({deleted:true,cleanupPending:true},202);}
  if(url.pathname==='/functions/v1/repertoire-upload'){uploads++;assert.deepEqual(route.request().postDataBuffer(),pdf);return respond({file:makeFile(newId,'new.pdf')},201)}
  if(url.pathname==='/auth/v1/user')return respond(session.user);
  if(url.pathname.endsWith('/rpc/list_my_choirs'))return respond([{choir_id:choir,member_id:member,choir_name:'055 Choir',choir_slug:'055',member_is_active:true,is_current:true}]);
  if(url.pathname.endsWith('/rpc/current_choir_id'))return respond(choir);
  if(url.pathname.endsWith('/choir_members'))return respond({id:member,choir_id:choir,auth_user_id:user,first_name:'Synthetic',last_name:'Manager',is_active:true,voice_group:'Şef',join_date:'2026-01-01',email:'055@example.invalid'});
  if(url.pathname.endsWith('/choir_member_roles'))return respond([{roles:{name:'Şef'}}]);
  if(url.pathname.endsWith('/repertoire_cache_versions'))return respond({version:2,updated_at:null});
  if(url.pathname.endsWith('/repertoire_tags')||url.pathname.endsWith('/song_assignments'))return respond([]);
  if(url.pathname.endsWith('/repertoire')){const value={...song,repertoire_files:activeFile?[activeFile]:[],repertoire_song_tags:[]};if(url.searchParams.has('id'))return respond(value);return respond(activeFile?[value]:[])}
  return respond([]);
 });
 await page.goto(`${origin}/repertuvar`);await page.getByText(song.title,{exact:true}).waitFor();await page.getByTitle('Düzenle',{exact:true}).click();await page.getByText('old.pdf',{exact:true}).waitFor();
 const pdfInput=page.locator('input[accept=".pdf"]');await pdfInput.setInputFiles({name:'new.pdf',mimeType:'application/pdf',buffer:pdf});await page.getByText('Bu PDF üzerinde anotasyonlar var. Güvenli sürüm geçmişi tamamlanmadan değiştirilemez.',{exact:true}).waitFor();assert.equal(uploads,0);
 annotated=false;await pdfInput.setInputFiles({name:'new.pdf',mimeType:'application/pdf',buffer:pdf});await page.getByText('PDF güncellendi.',{exact:true}).waitFor();await page.getByText('new.pdf',{exact:true}).waitFor();assert.equal(uploads,1);
 await page.getByTitle('PDF Sil',{exact:true}).click();const confirm=page.getByText('Sil?',{exact:true}).locator('..');await confirm.getByRole('button').first().click();await page.getByText('PDF kaldırıldı; özel depolama temizliği bekliyor.',{exact:true}).waitFor();
 assert.equal(lifecycle,4);assert.equal(driveHits,0);assert.deepEqual(errors,[]);await page.screenshot({path:'spike/055-browser-result.png',fullPage:true});
 console.log('PASS production Chrome 412x915: annotated replacement refusal, verified replacement, pending private cleanup, zero Drive calls/errors');
}finally{await browser.close()}
