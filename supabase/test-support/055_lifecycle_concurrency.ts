import assert from 'node:assert/strict';
import { spawn,execFileSync } from 'node:child_process';
const database=process.env.PGDATABASE??'';
if(!/^genova_055_test[A-Za-z0-9_]*$/.test(database)||process.env.PGHOST!=='127.0.0.1') throw new Error('055 concurrency requires owned loopback database');
const executable=process.env.PSQL_BIN??'/opt/homebrew/opt/libpq/bin/psql';
const args=['-X','-Atq','-v','ON_ERROR_STOP=1'];
const call=`select public.repertoire_lifecycle_055('reserve-delete','10000000-0000-4000-8000-000000000055',null,
 '20000000-0000-4000-8000-000000000055',gen_random_uuid(),'file','60000000-0000-4000-8000-000000000055','delete')->>'state';`;
function start(sql:string){const child=spawn(executable,[...args,'-c',sql],{env:process.env,stdio:['ignore','pipe','pipe']});let output='',error='';
 child.stdout.on('data',v=>{output+=String(v)});child.stderr.on('data',v=>{error+=String(v)});
 const done=new Promise<string>((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve(output.trim()):reject(new Error(error)))});void done.catch(()=>undefined);return{child,done};}
async function main(){const first=start(`begin; set local application_name='genova-055-delete-first'; set local role service_role; ${call} select pg_sleep(1.5); commit;`);let second:ReturnType<typeof start>|undefined;
 try{let acquired=false;for(let i=0;i<30;i++){if(first.child.exitCode!==null)break;acquired=execFileSync(executable,[...args,'-c',"select exists(select 1 from pg_stat_activity where application_name='genova-055-delete-first' and wait_event='PgSleep');"],{encoding:'utf8'}).trim()==='t';if(acquired)break;await new Promise(r=>setTimeout(r,25));}
  assert.ok(acquired,'First transaction never reserved deletion');second=start(`begin; set local role service_role; ${call} commit;`);
  assert.match(await first.done,/cleanup/);assert.equal(await second.done,'cleanup');
  const counts=execFileSync(executable,[...args,'-c',`select (select count(*) from genova_055.deletion_jobs where target_id='60000000-0000-4000-8000-000000000055'),(select count(*) from public.repertoire_files where id='60000000-0000-4000-8000-000000000055');`],{encoding:'utf8'}).trim();
  assert.equal(counts,'1|0');console.log('PASS concurrent delete: one job, exact replay, product row absent');
 }finally{if(first.child.exitCode===null)first.child.kill('SIGTERM');if(second&&second.child.exitCode===null)second.child.kill('SIGTERM');await Promise.allSettled([first.done,...(second?[second.done]:[])]);}}
main().catch(error=>{console.error(error);process.exitCode=1});
