// Run against an already-built loopback candidate. Every account/provider response is synthetic.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const origin='http://127.0.0.1:4174',supabaseOrigin='https://example.supabase.co';
const choir='20000000-0000-4000-8000-000000000057',member='30000000-0000-4000-8000-000000000057';
const user='10000000-0000-4000-8000-000000000057',assignmentId='50000000-0000-4000-8000-000000000057';
const submissionId='60000000-0000-4000-8000-000000000057',versions=['70000000-0000-4000-8000-000000000057','70000000-0000-4000-8000-000000000058'];
const expires=Math.floor(Date.now()/1000)+3600,token=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:user,session_id:'71000000-0000-4000-8000-000000000057',exp:expires,role:'authenticated',aud:'authenticated'})).toString('base64url')}.synthetic`;
const session={access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_in:3600,expires_at:expires,user:{id:user,aud:'authenticated',role:'authenticated',email:'057@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-09-22T00:00:00Z'}};
const memberRow={id:member,choir_id:choir,auth_user_id:user,first_name:'Synthetic',last_name:'Singer',voice_group:'Soprano',photo_url:null,is_active:true,join_date:'2026-01-01',email:'057@example.invalid'};
const assignment={id:assignmentId,choir_id:choir,title:'057 Private Assignment',description:'Synthetic acceptance',deadline:null,target_voice_group:'Soprano',drive_folder_id:null,created_by:'31000000-0000-4000-8000-000000000057',is_active:true,is_locked:false,locked_at:null,locked_by:null,created_at:'2026-09-22T00:00:00Z',updated_at:'2026-09-22T00:00:00Z',choir_members:{first_name:'Synthetic',last_name:'Chef',photo_url:null}};
const wav=Buffer.concat([Buffer.from('RIFF'),Buffer.from([40,0,0,0]),Buffer.from('WAVEfmt '),Buffer.alloc(24)]);
let current=null,history=[],uploadCount=0,notifyCount=0,ticketCount=0,contentCount=0,driveHits=0;const errors=[],seen=[];
function submission(version,fileName){const now=new Date().toISOString();return{id:submissionId,assignment_id:assignmentId,member_id:member,drive_file_id:`r2_${version}`,drive_web_view_link:null,drive_download_link:null,current_file_version_id:version,file_name:fileName,mime_type:'audio/wav',file_size_bytes:wav.length,drive_member_folder_id:null,submitted_at:now,updated_at:now,status:'pending',submission_note:null,reviewer_note:null,reviewer_audio_drive_file_id:null,reviewer_audio_file_name:null,reviewer_audio_mime_type:null,reviewer_audio_file_size_bytes:null,is_reviewer_note_hidden:false,hidden_by:null,hidden_at:null,approved_at:null,approved_by:null};}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const context=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'block'});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(stored=>localStorage.setItem('sb-example-auth-token',JSON.stringify(stored)),session);
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());seen.push(`${request.method()} ${url.origin}${url.pathname}`);const respond=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if((url.hostname==='127.0.0.1'||url.hostname==='localhost')&&url.port==='4174'){if(url.pathname==='/api/assignment-submissions/upload'){notifyCount++;assert.equal(request.method(),'POST');const body=request.postDataJSON();assert.equal(body.action,'notify_private_upload');assert.equal(body.submissionId,submissionId);assert.equal(body.fileVersionId,current.current_file_version_id);return route.fulfill({status:204,body:''});}
   if(url.pathname==='/api/drive-file-token'){driveHits++;return respond({error:'legacy forbidden'},500);}return route.continue();}
  if(url.origin!==supabaseOrigin)return route.abort();
  if(url.pathname.includes('drive-manager')){driveHits++;return respond({error:'Drive forbidden'},500);}
  if(url.pathname==='/functions/v1/assignment-upload'){uploadCount++;assert.deepEqual(request.postDataBuffer(),wav);const metadata=JSON.parse(decodeURIComponent(request.headers()['x-upload-metadata']));
   assert.deepEqual(metadata,{assignmentId,fileName:`take-${uploadCount}.wav`,mimeType:'audio/wav',size:wav.length,note:null});
   if(current)history=[{...current,id:`history-${uploadCount}`,source_submission_id:submissionId,file_version_id:current.current_file_version_id,archive_reason:'resubmitted',archived_at:new Date().toISOString()}];
   current=submission(versions[uploadCount-1],metadata.fileName);return respond({submission:current,fileVersionId:current.current_file_version_id,replayed:false},201);}
  if(url.pathname==='/functions/v1/assignment-file'){if(request.method()==='POST'){ticketCount++;const {fileId}=request.postDataJSON();assert.ok(versions.includes(fileId));return respond({url:`?fileId=${fileId}&ticket=synthetic-${fileId}`,expiresAt:Date.now()+60000});}
   contentCount++;return route.fulfill({status:200,contentType:'audio/wav',headers:{'cache-control':'private, no-store','content-length':String(wav.length)},body:wav});}
  if(url.pathname==='/auth/v1/user')return respond(session.user);
  if(url.pathname.endsWith('/rpc/list_my_choirs'))return respond([{choir_id:choir,member_id:member,choir_name:'057 Choir',choir_slug:'057',member_is_active:true,is_current:true}]);
  if(url.pathname.endsWith('/rpc/current_choir_id'))return respond(choir);
  if(url.pathname.endsWith('/choir_member_roles'))return respond([]);
  const objectResponse=String(request.headers().accept??'').includes('application/vnd.pgrst.object');
  if(url.pathname.endsWith('/choir_members'))return respond(objectResponse?memberRow:[memberRow]);
  if(url.pathname.endsWith('/assignments'))return respond(objectResponse?assignment:[assignment]);
  if(url.pathname.endsWith('/assignment_submissions'))return respond(current?[current]:[]);
  if(url.pathname.endsWith('/assignment_submission_history'))return respond(history);
  if(url.pathname.endsWith('/assignment_submission_audit_logs')||url.pathname.endsWith('/assignment_submission_private_notes')||url.pathname.endsWith('/assignment_targets'))return respond([]);
  return respond([]);
 });
 await page.goto(`${origin}/odevler/${assignmentId}`);await page.getByText(assignment.title,{exact:true}).waitFor();
 await page.getByRole('button',{name:'Dosya Yükle'}).click();let input=page.locator('input[type="file"]');await input.setInputFiles({name:'take-1.wav',mimeType:'audio/wav',buffer:wav});await page.getByRole('button',{name:'Yükle',exact:true}).click();
 await page.getByText('Ödev Teslim Et',{exact:true}).waitFor({state:'hidden',timeout:10000});await page.getByTitle('Düzenle',{exact:true}).waitFor();assert.equal(uploadCount,1);assert.equal(notifyCount,1,seen.join('\n'));
 await page.reload();await page.getByText(assignment.title,{exact:true}).waitFor();await page.getByText('take-1.wav',{exact:true}).waitFor();
 await page.getByTitle('Düzenle',{exact:true}).click();await page.getByRole('button',{name:/Değiştir/}).click();await page.getByText('Teslimi Güncelle',{exact:true}).waitFor({state:'visible'});input=page.locator('input[type="file"]').last();await input.setInputFiles({name:'take-2.wav',mimeType:'audio/wav',buffer:wav});const secondUpload=page.getByRole('button',{name:'Yükle',exact:true}).last();await secondUpload.waitFor({state:'visible'});await secondUpload.click();
 await page.getByText('Teslimi Güncelle',{exact:true}).waitFor({state:'hidden',timeout:10000});await page.getByText('take-2.wav',{exact:true}).waitFor({timeout:10000});await page.getByText('Geçmiş Teslim #1',{exact:true}).waitFor();await page.getByText('take-1.wav',{exact:true}).waitFor();
 assert.equal(uploadCount,2);assert.equal(notifyCount,2);assert.ok(ticketCount>=3);assert.equal(driveHits,0);assert.deepEqual(errors,[]);
 const links=page.locator('a[href*="/functions/v1/assignment-file"]');assert.ok(await links.count()>=2);const popupPromise=context.waitForEvent('page');await links.last().click();const opened=await popupPromise;await opened.waitForLoadState().catch(()=>{});assert.ok(contentCount>=1);await opened.close();
 await page.screenshot({path:'spike/057-browser-result.png',fullPage:true});
 console.log(`PASS production Chrome 412x915: private initial/resubmit/history, notifications=${notifyCount}, tickets=${ticketCount}, reads=${contentCount}, zero Drive calls/errors`);
}finally{await browser.close();}
