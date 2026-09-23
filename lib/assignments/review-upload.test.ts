// @vitest-environment node
import{beforeEach,describe,expect,it,vi}from'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),access:vi.fn(),fetch:vi.fn()}));
vi.mock('../supabase',()=>({supabase:{rpc:mock.rpc}}));
vi.mock('../web-auth-capability',()=>({requireCurrentWebAccess:mock.access,authenticatedWebFetch:mock.fetch}));
import{uploadPrivateAssignmentReview}from'./review-upload';
const submissionId='60000000-0000-4000-8000-000000000058',versionId='70000000-0000-4000-8000-000000000058';
function input(){return{submissionId,status:'approved' as const,reviewerNote:'Good',file:new File(['RIFF1234WAVEdata'],'review.wav',{type:'audio/wav'})};}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');mock.access.mockResolvedValue({userId:'user-a',accessToken:'token-a'});mock.rpc.mockResolvedValue({data:'choir-a',error:null});mock.fetch.mockImplementation(async(url:string)=>url.includes('/functions/v1/assignment-review-upload')?new Response(JSON.stringify({submission:{id:submissionId,reviewer_audio_file_version_id:versionId},fileVersionId:versionId,replayed:false}),{status:201}):new Response(null,{status:204}));});
describe('private assignment review web upload',()=>{
  it('streams original audio and emits a small one-shot notification request',async()=>{const value=input();await uploadPrivateAssignmentReview(value);const[url,init]=mock.fetch.mock.calls[0];expect(url).toBe('https://example.supabase.co/functions/v1/assignment-review-upload');expect(init.body).toBe(value.file);expect(JSON.parse(decodeURIComponent(init.headers['X-Upload-Metadata']))).toEqual({submissionId,fileName:'review.wav',mimeType:'audio/wav',size:value.file.size,status:'approved',reviewerNote:'Good'});expect(JSON.parse(mock.fetch.mock.calls[1][1].body)).toEqual({action:'notify_private_review',submissionId,fileVersionId:versionId});});
  it('does not notify a committed replay',async()=>{mock.fetch.mockResolvedValueOnce(new Response(JSON.stringify({submission:{id:submissionId,reviewer_audio_file_version_id:versionId},fileVersionId:versionId,replayed:true})));await uploadPrivateAssignmentReview(input());expect(mock.fetch).toHaveBeenCalledTimes(1);});
  it('reuses retry identity after a lost response',async()=>{const value=input();mock.fetch.mockRejectedValueOnce(new Error('lost'));await expect(uploadPrivateAssignmentReview(value)).rejects.toThrow('lost');await uploadPrivateAssignmentReview(value);expect(mock.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(mock.fetch.mock.calls[1][1].headers['Idempotency-Key']);});
  it('refuses unsupported labels before network',async()=>{const value=input();value.file=new File(['x'],'review.mid',{type:'audio/midi'});await expect(uploadPrivateAssignmentReview(value)).rejects.toThrow('desteklenmiyor');expect(mock.fetch).not.toHaveBeenCalled();});
});
