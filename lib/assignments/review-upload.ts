import type { AssignmentSubmission } from '../supabase';
import { supabase } from '../supabase';
import { authenticatedWebFetch, requireCurrentWebAccess } from '../web-auth-capability';

export const ASSIGNMENT_REVIEW_AUDIO_MAX_BYTES=20*1024*1024;
const AUDIO=new Set(['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac']);
const retryKeys=new WeakMap<File,Map<string,string>>();
const messages:Record<string,string>={unauthorized:'Oturumunuz sona erdi. Yeniden giriş yapın.',forbidden:'Bu teslimi değerlendirme yetkiniz yok.','upload-pending':'Değerlendirme sesi hâlâ işleniyor. Biraz sonra aynı dosyayla tekrar deneyin.','upload-conflict':'Yükleme isteği önceki denemeyle eşleşmiyor.','upload-reconciliation-required':'Yükleme sonucu doğrulanamadı. Dosyayı tekrar seçmeyin; aynı değerlendirme kontrol edilmelidir.','upload-unavailable':'Özel değerlendirme sesi şu anda kullanılamıyor.','size-exceeded':'Ses dosyası 20 MB sınırını aşıyor.','invalid-media':'Ses dosyasının içeriği uzantı ve türüyle eşleşmiyor.'};

export function isPrivateAssignmentReviewUploadEnabled(){return process.env.NEXT_PUBLIC_ASSIGNMENT_REVIEW_R2_ENABLED==='true';}

/** Streams review audio to the private Edge boundary; provider location and credentials stay server-only. */
export async function uploadPrivateAssignmentReview(input:{submissionId:string;status:'approved'|'rejected';reviewerNote?:string;file:File;retryKey?:string;}):Promise<AssignmentSubmission>{
  const mime=input.file.type.toLowerCase();
  if(input.file.size<1)throw new Error('Ses dosyası boş olamaz.');
  if(input.file.size>ASSIGNMENT_REVIEW_AUDIO_MAX_BYTES)throw new Error(messages['size-exceeded']);
  if(!AUDIO.has(mime))throw new Error('Bu ses dosyası türü desteklenmiyor.');
  const access=await requireCurrentWebAccess('mutation'),{data:choirId,error}=await supabase.rpc('current_choir_id');
  if(error||typeof choirId!=='string')throw new Error('Aktif koro bulunamadı.');
  const metadata={submissionId:input.submissionId,fileName:input.file.name,mimeType:mime,size:input.file.size,
    status:input.status,reviewerNote:input.reviewerNote?.trim()||null};
  const scope=JSON.stringify([access.userId,choirId,metadata]);let keys=retryKeys.get(input.file);
  if(!keys){keys=new Map();retryKeys.set(input.file,keys);}const retryKey=input.retryKey??keys.get(scope)??crypto.randomUUID();keys.set(scope,retryKey);
  const current=await requireCurrentWebAccess('mutation'),active=await supabase.rpc('current_choir_id');
  if(current.userId!==access.userId||current.accessToken!==access.accessToken||active.error||active.data!==choirId)
    throw new Error('Oturum veya koro değişti. Yüklemeyi yeniden başlatın.');
  const origin=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!origin)throw new Error('Dosya hizmeti yapılandırılmamış.');
  const response=await authenticatedWebFetch(`${origin.replace(/\/$/u,'')}/functions/v1/assignment-review-upload`,{
    method:'POST',headers:{'Content-Type':mime,'X-Upload-Metadata':encodeURIComponent(JSON.stringify(metadata)),'Idempotency-Key':retryKey},body:input.file,
  },access);
  let result:{submission?:AssignmentSubmission;fileVersionId?:string;replayed?:boolean;error?:string};
  try{result=await response.json();}catch{throw new Error('Yükleme yanıtı doğrulanamadı. Aynı dosyayla tekrar deneyin.');}
  if(!response.ok)throw new Error(messages[result.error??'']??'Değerlendirme sesi yüklenemedi. Aynı dosyayla tekrar deneyin.');
  if(!result.submission?.id||result.submission.id!==input.submissionId||!result.fileVersionId||
    (result.submission.reviewer_audio_file_version_id!==result.fileVersionId&&
      !(result.submission.is_reviewer_note_hidden&&result.submission.reviewer_audio_file_version_id==null)))
    throw new Error('Değerlendirme yanıtı geçersiz.');
  if(result.replayed===false){await authenticatedWebFetch('/api/assignment-submissions/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'notify_private_review',submissionId:input.submissionId,fileVersionId:result.fileVersionId})},access).catch(()=>undefined);}
  keys.delete(scope);return result.submission;
}
