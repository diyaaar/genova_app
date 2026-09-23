import{beforeEach,describe,expect,it,vi}from'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),tenant:vi.fn(),push:vi.fn(),actor:vi.fn(),audit:vi.fn()}));
vi.mock('@/lib/server/supabase-auth',()=>({requireAuthenticatedUser:mocks.auth}));
vi.mock('@/lib/server/tenant-client',()=>({createTenantServiceClient:mocks.tenant}));
vi.mock('@/lib/server/push-notifications',()=>({sendAssignmentReviewPush:mocks.push}));
vi.mock('@/lib/server/reviewer-auth',()=>({getActorMemberWithRoles:mocks.actor}));
vi.mock('@/lib/server/assignment-audit',()=>({insertAssignmentAuditLog:mocks.audit}));
import{POST}from'./route';
const submissionId='60000000-0000-4000-8000-000000000058',versionId='70000000-0000-4000-8000-000000000058';
function client(hidden=false,claimed=true){const results:Record<string,unknown>={assignment_submissions:{data:{id:submissionId,choir_id:'choir-1',assignment_id:'assignment-1',member_id:'member-1',status:'approved',reviewer_note:hidden?null:'Good',reviewer_audio_file_version_id:hidden?null:versionId,is_reviewer_note_hidden:hidden},error:null},assignment_submission_private_notes:{data:{reviewer_audio_file_version_id:versionId},error:null}};return{rpc:vi.fn(async()=>({data:claimed,error:null})),from(table:string){const result=results[table];const chain:Record<string,unknown>={};for(const method of['select','eq'])chain[method]=vi.fn(()=>chain);chain.maybeSingle=vi.fn(async()=>result);return chain;}};}
function request(){return new Request('http://local/api/assignment-submissions/review',{method:'POST',headers:{authorization:'Bearer token','content-type':'application/json'},body:JSON.stringify({action:'notify_private_review',submissionId,fileVersionId:versionId})});}
describe('private assignment review notification',()=>{beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({user:{id:'reviewer-user'},accessToken:'token'});});
  it('claims the exact visible version once before push',async()=>{const value=client();mocks.tenant.mockResolvedValue(value);const response=await POST(request());expect(response.status).toBe(204);expect(value.rpc).toHaveBeenCalledWith('claim_assignment_review_notification_058',{p_actor_id:'reviewer-user',p_choir_id:'choir-1',p_submission_id:submissionId,p_file_version_id:versionId});expect(mocks.push).toHaveBeenCalledWith({memberId:'member-1',assignmentId:'assignment-1',status:'approved',reviewerMessage:'Good'});});
  it('validates a hidden pointer without exposing its note and suppresses duplicate push',async()=>{mocks.tenant.mockResolvedValueOnce(client(true,true)).mockResolvedValueOnce(client(true,false));expect((await POST(request())).status).toBe(204);expect(mocks.push).toHaveBeenLastCalledWith(expect.objectContaining({reviewerMessage:null}));mocks.push.mockClear();expect((await POST(request())).status).toBe(204);expect(mocks.push).not.toHaveBeenCalled();});
});
