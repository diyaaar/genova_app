// @vitest-environment node
import { beforeEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({access:vi.fn(),fetch:vi.fn(),upload:vi.fn()}));
vi.mock('../web-auth-capability',()=>({requireCurrentWebAccess:mock.access,authenticatedWebFetch:mock.fetch}));
vi.mock('./upload',()=>({uploadPrivateRepertoireFile:mock.upload}));
import { deletePrivateRepertoireFile,deletePrivateRepertoireSong,preflightPrivateRepertoireReplacement,
  replacePrivateRepertoireFile } from './lifecycle';

const fileId='30000000-0000-4000-8000-000000000055';
const songId='50000000-0000-4000-8000-000000000055';
const oldFile={id:fileId,song_id:songId,file_name:'old.pdf',file_type:'sheet' as const,
  drive_file_id:`r2_${fileId}`,drive_web_view_link:null,drive_download_link:null,
  mime_type:'application/pdf',file_size_bytes:10,partition_label:null,uploaded_by:null,
  created_at:'2026-09-22T00:00:00Z',updated_at:'2026-09-22T00:00:00Z'};
beforeEach(()=>{
  vi.resetAllMocks(); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');
  mock.access.mockResolvedValue({userId:'user',accessToken:'token'});
  mock.fetch.mockResolvedValue(new Response(JSON.stringify({ready:true})));
  mock.upload.mockResolvedValue({...oldFile,id:'new-file'});
});

describe('private repertoire lifecycle web adapter',()=>{
  it('preflights annotated-file safety through the Edge boundary',async()=>{
    await preflightPrivateRepertoireReplacement(fileId);
    expect(mock.fetch.mock.calls[0][0]).toBe('https://example.supabase.co/functions/v1/repertoire-file-lifecycle');
    expect(mock.fetch.mock.calls[0][1]).toMatchObject({method:'POST'});
    expect(JSON.parse(mock.fetch.mock.calls[0][1].body)).toEqual({targetType:'file',targetId:fileId,mode:'replacement'});
  });
  it('reports a DB-deleted file with pending private cleanup without Drive fallback',async()=>{
    mock.fetch.mockResolvedValue(new Response(JSON.stringify({deleted:true,cleanupPending:true}),{status:202}));
    await expect(deletePrivateRepertoireFile(fileId)).resolves.toEqual({cleanupPending:true});
    expect(mock.fetch.mock.calls[0][1]).toMatchObject({method:'DELETE'});
  });
  it('uses the song target contract for an R2-only song',async()=>{
    mock.fetch.mockResolvedValue(new Response(JSON.stringify({deleted:true,cleanupPending:false})));
    await deletePrivateRepertoireSong(songId);
    expect(JSON.parse(mock.fetch.mock.calls[0][1].body)).toEqual({targetType:'song',targetId:songId,mode:'delete'});
  });
  it('orders replacement as check, verified upload, then old-file retirement',async()=>{
    const order:string[]=[];
    mock.fetch.mockImplementation(async(_url:string,init:RequestInit)=>{
      const method=init.method as string; order.push(method);
      return new Response(JSON.stringify(method==='POST'?{ready:true}:{deleted:true,cleanupPending:false}));
    });
    mock.upload.mockImplementation(async()=>{order.push('UPLOAD'); return {...oldFile,id:'new-file'};});
    await replacePrivateRepertoireFile({oldFile,file:new File(['%PDF-1.4'],'new.pdf',{type:'application/pdf'}),
      fileType:'sheet',mimeType:'application/pdf'});
    expect(order).toEqual(['POST','UPLOAD','DELETE']);
  });
  it('does not upload after annotation refusal and preserves both files after retirement refusal',async()=>{
    mock.fetch.mockResolvedValueOnce(new Response(JSON.stringify({error:'annotated-pdf'}),{status:409}));
    await expect(replacePrivateRepertoireFile({oldFile,file:new File(['x'],'new.pdf'),fileType:'sheet',mimeType:'application/pdf'}))
      .rejects.toThrow('anotasyonlar');
    expect(mock.upload).not.toHaveBeenCalled();
    mock.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ready:true})))
      .mockResolvedValueOnce(new Response(JSON.stringify({error:'annotated-pdf'}),{status:409}));
    await expect(replacePrivateRepertoireFile({oldFile,file:new File(['x'],'new.pdf'),fileType:'sheet',mimeType:'application/pdf'}))
      .rejects.toThrow('Yeni dosya doğrulandı ancak eski dosya korunarak kaldı');
    expect(mock.upload).toHaveBeenCalledTimes(1);
  });
});
