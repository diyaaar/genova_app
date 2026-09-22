// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createAssignmentUploadHandler, MAX_ASSIGNMENT_UPLOAD_BYTES,
  type AssignmentUploadDependencies, type AssignmentUploadMetadata,
  type AssignmentUploadReservation,
} from './handler';

const choirId='20000000-0000-4000-8000-000000000057';
const assignmentId='50000000-0000-4000-8000-000000000057';
const submissionId='30000000-0000-4000-8000-000000000057';
const fileVersionId='70000000-0000-4000-8000-000000000057';
const lease='40000000-0000-4000-8000-000000000057';
const retryKey='60000000-0000-4000-8000-000000000057';
const bytes=new TextEncoder().encode('RIFF1234WAVEdata');
const metadata:AssignmentUploadMetadata={assignmentId,fileName:'take.wav',mimeType:'audio/wav',size:bytes.length,note:'first'};

function request(meta=metadata,body:Uint8Array=bytes){return new Request('http://127.0.0.1/upload',{method:'POST',
  headers:{authorization:'Bearer synthetic','idempotency-key':retryKey,
    'x-upload-metadata':encodeURIComponent(JSON.stringify(meta)),'content-type':meta.mimeType},body:Buffer.from(body)});}

function fixture(){
  let state:AssignmentUploadReservation['state']='uploading';let object:Uint8Array|undefined;let reserved=false;
  const reservation:AssignmentUploadReservation={state,submissionId,fileVersionId,choirId,lease,bucket:'genova-private',
    objectKey:`choirs/${choirId}/assignments/${assignmentId}/submissions/${fileVersionId}/content`};
  const submission={id:submissionId,assignment_id:assignmentId,current_file_version_id:fileVersionId};
  const transact=vi.fn<AssignmentUploadDependencies['transact']>(async({action})=>{
    if(action==='reserve'&&reserved&&state==='uploading')return{state:'pending'};reserved=true;
    if(action==='commit')state='committed';
    if(state==='committed')return{...reservation,state,submission};
    if(action==='cleanup')state='cleanup';if(action==='failed')state='failed';
    return{...reservation,state};
  });
  const provider=vi.fn<AssignmentUploadDependencies['object']>(async({method,body,metadata:meta})=>{
    if(method==='PUT'){object=new Uint8Array(await new Response(body).arrayBuffer());return new Response(null);}
    if(method==='DELETE'){object=undefined;return new Response(null,{status:204});}
    return new Response(object?Buffer.from(object):null,{status:object?200:404,
      headers:{'content-type':meta.mimeType,'content-length':String(object?.length??0)}});
  });
  const deps:AssignmentUploadDependencies={enabled:true,bucket:'genova-private',
    authorize:vi.fn(async()=>({userId:'user',sessionId:null,choirId})),transact,object:provider};
  return{deps,transact,provider,handler:createAssignmentUploadHandler(deps),getObject:()=>object,reservation};
}

describe('057 private assignment upload lifecycle',()=>{
  it('streams, verifies, commits and replays the same immutable version',async()=>{
    const f=fixture();const response=await f.handler(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({submission:{id:submissionId,assignment_id:assignmentId,
      current_file_version_id:fileVersionId},fileVersionId,replayed:false});
    expect(f.provider.mock.calls.map(([value])=>value.method)).toEqual(['PUT','GET']);
    expect(f.transact.mock.calls.map(([value])=>value.action)).toEqual(['reserve','commit']);
    expect(f.transact.mock.calls[1]?.[0].sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect((await f.handler(request())).status).toBe(200);expect(f.provider).toHaveBeenCalledTimes(2);
  });
  it.each([
    [{...metadata,fileName:'bad.svg'},415],[{...metadata,mimeType:'text/html'},415],
    [{...metadata,fileName:'../take.wav'},400],[{...metadata,size:MAX_ASSIGNMENT_UPLOAD_BYTES+1},413],
    [{...metadata,note:'x'.repeat(1201)},400],[{...metadata,extra:true},400],
  ])('refuses unsafe or unbounded metadata before reservation',async(meta,status)=>{
    const f=fixture();expect((await f.handler(request(meta as AssignmentUploadMetadata))).status).toBe(status);
    expect(f.transact).not.toHaveBeenCalled();expect(f.provider).not.toHaveBeenCalled();
  });
  it('accepts a passive generic binary while still hashing exact bytes',async()=>{
    const f=fixture();const generic=new Uint8Array([0,1,2,3,4]);
    const meta={...metadata,fileName:'exercise.bin',mimeType:'application/octet-stream',size:generic.length};
    expect((await f.handler(request(meta,generic))).status).toBe(201);
    expect(f.transact.mock.calls[1]?.[0].sha256).toBe(createHash('sha256').update(generic).digest('hex'));
  });
  it('never commits a mismatched readback and deletes only the reserved object',async()=>{
    const f=fixture();const original=f.deps.object;
    f.deps.object=async(input)=>input.method==='GET'
      ? new Response(Buffer.from('wrong'),{headers:{'content-type':metadata.mimeType,'content-length':'5'}})
      : original(input);
    expect((await f.handler(request())).ok).toBe(false);
    expect(f.transact.mock.calls.map(([value])=>value.action)).toEqual(['reserve','cleanup','failed']);
    expect(f.provider.mock.calls.at(-1)?.[0]).toMatchObject({method:'DELETE',reservation:f.reservation});
  });
  it('preserves an uncertain PUT for reconciliation and never races it with DELETE',async()=>{
    const f=fixture();const original=f.deps.object;
    f.deps.object=async(input)=>{const result=await original(input);if(input.method==='PUT')throw new Error('lost');return result;};
    const response=await f.handler(request());expect(response.status).toBe(503);
    expect(await response.json()).toEqual({error:'upload-reconciliation-required',retryKey});
    expect(f.provider.mock.calls.map(([value])=>value.method)).toEqual(['PUT']);expect(f.getObject()).toEqual(bytes);
  });
  it('refuses pending and forged reservations without touching the provider',async()=>{
    for(const result of [{state:'pending'},{...fixture().reservation,bucket:'wrong'}] as AssignmentUploadReservation[]){
      const f=fixture();f.deps.transact=async()=>result;
      expect((await f.handler(request())).ok).toBe(false);expect(f.provider).not.toHaveBeenCalled();
    }
  });
});
