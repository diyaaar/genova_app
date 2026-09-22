// @vitest-environment node
import { describe,expect,it,vi } from 'vitest';
import { createRepertoireLifecycleHandler,type LifecycleDependencies,type LifecycleResult } from './handler';
import { UploadError } from '../repertoire-upload/stream';

const choirId='20000000-0000-4000-8000-000000000055';
const fileId='30000000-0000-4000-8000-000000000055';
const retryKey='60000000-0000-4000-8000-000000000055';
const target={fileId,bucket:'genova-private',objectKey:`choirs/${choirId}/repertoire/${fileId}/content`};
function request(method:'POST'|'DELETE'='DELETE',body={targetType:'file',targetId:fileId,mode:method==='POST'?'replacement':'delete'}) {
  return new Request('http://local/lifecycle',{method,headers:{authorization:'Bearer synthetic',
    'content-type':'application/json','idempotency-key':retryKey},body:JSON.stringify(body)});
}
function fixture(initial:LifecycleResult={state:'cleanup',targetType:'file',targetId:fileId,targets:[target]}) {
  let state=initial;
  const transact=vi.fn<LifecycleDependencies['transact']>(async ({action})=>{
    if(action==='check-replace') return {state:'ready'};
    if(action==='cleaned'){state={...initial,state:'cleaned'}; return state;}
    return state;
  });
  const remove=vi.fn<LifecycleDependencies['remove']>(async()=>new Response(null,{status:204}));
  const deps:LifecycleDependencies={enabled:true,bucket:'genova-private',
    authorize:vi.fn(async()=>({userId:'user',sessionId:null,choirId})),transact,remove};
  return {deps,transact,remove,handler:createRepertoireLifecycleHandler(deps)};
}

describe('055 private repertoire lifecycle',()=>{
  it('preflights replacement without touching provider or deleting a row',async()=>{
    const f=fixture(); const response=await f.handler(request('POST'));
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ready:true});
    expect(f.transact.mock.calls.map(([v])=>v.action)).toEqual(['check-replace']);
    expect(f.remove).not.toHaveBeenCalled();
  });
  it('removes only exact DB-owned targets and marks cleanup complete',async()=>{
    const f=fixture(); const response=await f.handler(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({deleted:true,cleanupPending:false,replayed:false});
    expect(f.remove).toHaveBeenCalledWith(target,expect.any(AbortSignal));
    expect(f.transact.mock.calls.map(([v])=>v.action)).toEqual(['reserve-delete','cleaned']);
  });
  it('accepts provider 404 and replays an already cleaned deletion',async()=>{
    const f=fixture(); f.deps.remove=vi.fn(async()=>new Response(null,{status:404}));
    expect((await f.handler(request())).status).toBe(200);
    const replay=fixture({state:'cleaned',targetType:'file',targetId:fileId,targets:[target]});
    expect(await (await replay.handler(request())).json()).toEqual({deleted:true,cleanupPending:false,replayed:true});
    expect(replay.remove).not.toHaveBeenCalled();
  });
  it.each([500,302])('keeps provider status %s as visible cleanup reconciliation',async(status)=>{
    const f=fixture(); f.deps.remove=vi.fn(async()=>new Response(null,{status}));
    const response=await f.handler(request());
    expect(response.status).toBe(202); expect(await response.json()).toEqual({deleted:true,cleanupPending:true});
    expect(f.transact.mock.calls.map(([v])=>v.action)).toEqual(['reserve-delete']);
  });
  it('keeps a lost final DB response as cleanup reconciliation',async()=>{
    const f=fixture(); f.deps.transact=vi.fn(async(input)=>{
      if(input.action==='cleaned') throw new Error('response lost');
      return {state:'cleanup',targetType:'file',targetId:fileId,targets:[target]};
    });
    const response=await f.handler(request());
    expect(response.status).toBe(202); expect(await response.json()).toEqual({deleted:true,cleanupPending:true});
  });
  it('rejects forged target data without a provider call',async()=>{
    const f=fixture({state:'cleanup',targetType:'file',targetId:fileId,targets:[{...target,bucket:'wrong'}]});
    const response=await f.handler(request());
    expect(response.status).toBe(202); expect(f.remove).not.toHaveBeenCalled();
  });
  it('preserves annotated-PDF and authorization refusals before provider access',async()=>{
    for(const error of [new UploadError('annotated-pdf',409),new UploadError('forbidden',403)]){
      const f=fixture(); f.deps.transact=async()=>{throw error};
      const response=await f.handler(request('POST'));
      expect(response.status).toBe(error.status); expect(f.remove).not.toHaveBeenCalled();
    }
  });
  it('refuses malformed, unauthenticated and disabled requests',async()=>{
    const f=fixture();
    expect((await f.handler(new Request('http://local',{method:'DELETE',headers:{'idempotency-key':retryKey},body:'{}'}))).status).toBe(400);
    f.deps.enabled=false; expect((await f.handler(request())).status).toBe(503);
    expect((await f.handler(new Request('http://local',{method:'OPTIONS'}))).status).toBe(204);
  });
});
