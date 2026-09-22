import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';

const database = process.env.PGDATABASE ?? '';
if (!/^genova_054_test[A-Za-z0-9_]*$/.test(database) || process.env.PGHOST !== '127.0.0.1') {
  throw new Error('054 concurrency requires the owned loopback database');
}
const executable = process.env.PSQL_BIN ?? '/opt/homebrew/opt/libpq/bin/psql';
const args = ['-X','-Atq','-v','ON_ERROR_STOP=1'];
const metadata = JSON.stringify({ songId:'50000000-0000-4000-8000-000000000054',fileName:'score.pdf',
  fileType:'sheet',mimeType:'application/pdf',size:69,partitionLabel:null });
const reserve = `select public.repertoire_upload_054('reserve','10000000-0000-4000-8000-000000000054',null,
  '20000000-0000-4000-8000-000000000054','60000000-0000-4000-8000-000000000054','${metadata}','genova-private')->>'state';`;
function start(sql: string) {
  const child = spawn(executable,[...args,'-c',sql],{ env:process.env,stdio:['ignore','pipe','pipe'] });
  let output='',error='';
  child.stdout.on('data',v => { output += String(v); });
  child.stderr.on('data',v => { error += String(v); });
  const done = new Promise<string>((resolve,reject) => {
    child.on('error',reject);
    child.on('exit',code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
  });
  void done.catch(() => undefined); // Keep early process errors handled until the awaited result.
  return { child,done, output:() => output };
}
async function main() {
  // First connection publishes its result while keeping the unique-key row locked.
  const first = start(`begin; set local application_name='genova-054-reserve-first'; set local role service_role; ${reserve} select pg_sleep(1.5); commit;`);
  let second: ReturnType<typeof start> | undefined;
  try {
    let acquired = false;
    for (let i=0;i<30;i++) {
      if (first.child.exitCode !== null) break;
      acquired = execFileSync(executable,[...args,'-c',"select exists(select 1 from pg_stat_activity where application_name='genova-054-reserve-first' and wait_event='PgSleep');"],{ encoding:'utf8' }).trim() === 't';
      if (acquired) break;
      await new Promise(r => setTimeout(r,25));
    }
    assert.ok(acquired,'First transaction never acquired reservation');
    second = start(`begin; set local role service_role; ${reserve} commit;`);
    assert.match(await first.done,/uploading/);
    assert.equal(await second.done,'pending');
    const counts = execFileSync(executable,[...args,'-c',`select
      (select count(*) from genova_054.uploads),
      (select count(*) from public.repertoire_files where choir_id='20000000-0000-4000-8000-000000000054');`],{ encoding:'utf8' });
    assert.equal(counts.trim(),'1|0');
    console.log('PASS concurrent identical reserve: one acquired lease, one pending, one reservation, zero visible files');
  } finally {
    if (first.child.exitCode === null) first.child.kill('SIGTERM');
    if (second && second.child.exitCode === null) second.child.kill('SIGTERM');
    await Promise.allSettled([first.done,...(second ? [second.done] : [])]);
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
