// Run only against a dedicated local restore. No production access or real users.
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGHOST, PGPORT, PGDATABASE, PSQL_BIN = 'psql' } = process.env;
if (PGHOST !== '127.0.0.1' || !PGPORT || !PGDATABASE?.startsWith('genova_008_test')) {
  throw new Error('Dedicated localhost genova_008_test database required');
}
function sql(input, allowedFailure = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(PSQL_BIN, ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], { env: process.env });
    let stdout = '', stderr = '';
    child.stdout.on('data', b => stdout += b);
    child.stderr.on('data', b => stderr += b);
    child.on('error', reject);
    child.on('close', code => code && !allowedFailure ? reject(new Error(stderr)) : resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}
const choir=randomUUID(), chef=randomUUID(), recipient=randomUUID(), session=randomUUID(), member=randomUUID();
const token=randomBytes(32).toString('hex'), hash=createHash('sha256').update(token).digest('hex');
try {
  await sql(`begin;
    insert into auth.users(id,email,email_confirmed_at) values ('${chef}','chef-${chef}@example.invalid',now()),('${recipient}','recipient-${recipient}@example.invalid',now());
    insert into auth.sessions(id,user_id) values ('${session}','${recipient}');
    insert into public.choirs(id,slug,name) values ('${choir}','test-${choir}','Concurrency test');
    insert into public.roles(choir_id,name) values ('${choir}','Şef'),('${choir}','Korist');
    insert into public.choir_members(id,choir_id,auth_user_id,email,first_name,last_name,voice_group,join_date,is_active)
      values ('${member}','${choir}','${chef}','chef-${chef}@example.invalid','Test','Chef','Şef',current_date,true);
    insert into public.choir_member_roles(choir_id,member_id,role_id) select '${choir}','${member}',id from public.roles where choir_id='${choir}' and name='Şef';
    insert into genova_008.invitations(choir_id,email,first_name,last_name,voice_group,token_hash,created_by)
      values ('${choir}','recipient-${recipient}@example.invalid','Test','Recipient','Alto','${hash}','${chef}');
    commit;`);
  const attempt=`begin; set local role authenticated;
    set local request.jwt.claims='{"sub":"${recipient}","session_id":"${session}","role":"authenticated"}';
    select public.choir_invitation_command('accept','{"token":"${token}"}'::jsonb); commit;`;
  const results=await Promise.all([sql(attempt,true),sql(attempt,true)]);
  assert.equal(results.filter(r=>r.code===0).length,1,'Exactly one concurrent acceptance succeeds');
  assert.match(results.find(r=>r.code!==0).stderr,/Invitation unavailable/);
  const before=await sql(`select count(*) from public.choir_members where auth_user_id='${recipient}';`);
  assert.equal(before.stdout.trim(),'1');
  // Down is exercised after a real committed test acceptance: membership survives.
  await sql(readFileSync(new URL('../rollback/008_choir_invitations_down.sql', import.meta.url),'utf8'));
  const after=await sql(`select count(*) from public.choir_members where auth_user_id='${recipient}';`);
  assert.equal(after.stdout.trim(),'1');
  console.log('008 concurrent acceptance and accepted-membership preservation: passed');
} finally {
  await sql(`begin;
    delete from public.choir_member_roles where choir_id='${choir}';
    delete from public.choir_members where choir_id='${choir}';
    delete from public.roles where choir_id='${choir}';
    delete from public.choirs where id='${choir}';
    delete from auth.sessions where id='${session}';
    delete from auth.users where id in ('${chef}','${recipient}'); commit;`);
}
