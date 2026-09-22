// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),access:vi.fn(),fetch:vi.fn()}));
vi.mock('../supabase',()=>({supabase:{rpc:mock.rpc}}));
vi.mock('../web-auth-capability',()=>({requireCurrentWebAccess:mock.access,authenticatedWebFetch:mock.fetch}));
import { uploadPrivateAssignmentSubmission } from './upload';

const assignmentId='50000000-0000-4000-8000-000000000057';
const submissionId='30000000-0000-4000-8000-000000000057';
const versionId='70000000-0000-4000-8000-000000000057';
function input(){return{assignmentId,file:new File(['RIFF1234WAVEdata'],'take.wav',{type:'audio/wav'}),note:'first'};}
beforeEach(()=>{
  vi.resetAllMocks();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');
  mock.access.mockResolvedValue({userId:'user-a',accessToken:'token-a'});
  mock.rpc.mockResolvedValue({data:'choir-a',error:null});
  mock.fetch.mockImplementation(async(url:string)=>url.includes('/functions/v1/assignment-upload')
    ? new Response(JSON.stringify({submission:{id:submissionId,assignment_id:assignmentId,
      current_file_version_id:versionId},fileVersionId:versionId,replayed:false}),{status:201})
    : new Response(null,{status:204}));
});
describe('private assignment web upload',()=>{
  it('streams the original File with no provider target and sends a small compatibility notification',async()=>{
    const value=input();await uploadPrivateAssignmentSubmission(value);
    const [url,init]=mock.fetch.mock.calls[0];expect(url).toBe('https://example.supabase.co/functions/v1/assignment-upload');
    expect(init.body).toBe(value.file);
    expect(JSON.parse(decodeURIComponent(init.headers['X-Upload-Metadata']))).toEqual({
      assignmentId,fileName:'take.wav',mimeType:'audio/wav',size:value.file.size,note:'first'});
    expect(mock.fetch.mock.calls[1][0]).toBe('/api/assignment-submissions/upload');
    expect(JSON.parse(mock.fetch.mock.calls[1][1].body)).toEqual({action:'notify_private_upload',
      submissionId,fileVersionId:versionId});
  });
  it('does not duplicate a compatibility notification for a committed replay',async()=>{
    mock.fetch.mockResolvedValueOnce(new Response(JSON.stringify({submission:{id:submissionId,
      assignment_id:assignmentId,current_file_version_id:versionId},fileVersionId:versionId,replayed:true})));
    await uploadPrivateAssignmentSubmission(input());expect(mock.fetch).toHaveBeenCalledTimes(1);
  });
  it('reuses the retry key after a lost response and never falls back to Drive',async()=>{
    const value=input();mock.fetch.mockRejectedValueOnce(new Error('lost'));
    await expect(uploadPrivateAssignmentSubmission(value)).rejects.toThrow('lost');
    await uploadPrivateAssignmentSubmission(value);
    expect(mock.fetch.mock.calls[0][1].headers['Idempotency-Key'])
      .toBe(mock.fetch.mock.calls[1][1].headers['Idempotency-Key']);
  });
  it('fails before sending bytes when the active choir changes',async()=>{
    mock.rpc.mockResolvedValueOnce({data:'choir-a',error:null}).mockResolvedValueOnce({data:'choir-b',error:null});
    await expect(uploadPrivateAssignmentSubmission(input())).rejects.toThrow('Oturum veya koro değişti');
    expect(mock.fetch).not.toHaveBeenCalled();
  });
});
