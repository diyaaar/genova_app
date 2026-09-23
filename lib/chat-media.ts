import { normalizeChatImageForUpload } from './drive';
import { getProtectedChatMediaFileUrl } from './drive-file-url';
import { authenticatedWebFetch, requireCurrentWebAccess } from './web-auth-capability';
import type { ChatMessage } from './chat';

const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const MAX_BYTES=12*1024*1024;
type BatchKeys={signature:string;batchId:string;retryKeys:string[];abortKey:string};
const batchKeys=new WeakMap<File,BatchKeys>();
const deleteKeys=new Map<string,string>();

export function isPrivateChatMediaEnabled(){return process.env.NEXT_PUBLIC_CHAT_R2_MEDIA_ENABLED==='true';}
function origin(){const value=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!value)throw new Error('Dosya servisi yapılandırılmamış.');return value.replace(/\/+$/u,'');}
async function payload(response:Response,message:string){let value:Record<string,any>={};try{value=await response.json();}catch{}if(!response.ok)throw new Error(typeof value.error==='string'?value.error:message);return value;}
function signature(roomId:string,replyToId:string|null,files:File[]){return JSON.stringify([roomId,replyToId,files.map(file=>[file.name,file.type,file.size,file.lastModified])]);}
function keys(roomId:string,replyToId:string|null,files:File[]){const key=signature(roomId,replyToId,files),existing=batchKeys.get(files[0]);if(existing?.signature===key)return existing;const next={signature:key,batchId:crypto.randomUUID(),retryKeys:files.map(()=>crypto.randomUUID()),abortKey:crypto.randomUUID()};batchKeys.set(files[0],next);return next;}
function asMessage(value:unknown){if(!value||typeof value!=='object')throw new Error('Görsel mesaj yanıtı geçersiz.');return value as ChatMessage;}

export async function hydrateChatMessageMedia(message:ChatMessage):Promise<ChatMessage>{
  if(message.message_type!=='image'||message.is_deleted)return message;
  const ids=message.metadata_json?.private_media_version_ids;
  if(!Array.isArray(ids)||!ids.every(id=>typeof id==='string'))return message;
  const names=Array.isArray(message.metadata_json?.private_media_file_names)?message.metadata_json.private_media_file_names:[];
  try{
    const urls=await Promise.all(ids.map((id,index)=>getProtectedChatMediaFileUrl(id,{file_name:typeof names[index]==='string'?names[index]:'chat-image',mime_type:'image/jpeg'})));
    return{...message,metadata_json:{...message.metadata_json,urls}};
  }catch{
    // Keep the room readable, but never fall back to a public/provider URL.
    const metadata={...message.metadata_json};delete metadata.urls;
    return{...message,metadata_json:metadata};
  }
}

async function uploadPart(access:Awaited<ReturnType<typeof requireCurrentWebAccess>>,file:File,metadata:Record<string,unknown>,retryKey:string){
  const request=()=>authenticatedWebFetch(`${origin()}/functions/v1/chat-media-upload`,{method:'POST',headers:{'Content-Type':String(metadata.mimeType),'X-Upload-Metadata':encodeURIComponent(JSON.stringify(metadata)),'Idempotency-Key':retryKey},body:file},access);
  try{return await request();}catch{return request();}
}

async function abortBatch(access:Awaited<ReturnType<typeof requireCurrentWebAccess>>,batchId:string,retryKey:string){
  return authenticatedWebFetch(`${origin()}/functions/v1/chat-media-lifecycle`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':retryKey},body:JSON.stringify({batchId})},access);
}

export async function sendPrivateChatImages(roomId:string,files:File[],replyToId:string|null){
  if(files.length<1||files.length>5)throw new Error('En fazla 5 görsel seçebilirsiniz.');
  const normalized=await Promise.all(files.map(normalizeChatImageForUpload));
  for(const file of normalized){const mime=file.type.toLowerCase();if(!MIME.has(mime)||file.size<1||file.size>MAX_BYTES)throw new Error('Görsel türü veya boyutu desteklenmiyor.');}
  const access=await requireCurrentWebAccess(),state=keys(roomId,replyToId,files);let result:Record<string,any>|null=null;
  try{for(let position=0;position<normalized.length;position++){const file=normalized[position],metadata={kind:'message-image',batchId:state.batchId,roomId,replyToId,expectedCount:normalized.length,position,fileName:file.name,mimeType:file.type.toLowerCase(),size:file.size};const response=await uploadPart(access,file,metadata,state.retryKeys[position]);result=await payload(response,'Görseller yüklenemedi.');}
    if(result?.state!=='committed'||!result.message)throw new Error('Görsel grubu tamamlanamadı.');batchKeys.delete(files[0]);return hydrateChatMessageMedia(asMessage(result.message));
  }catch(error){const aborted=await abortBatch(access,state.batchId,state.abortKey).catch(()=>null);if(aborted?.status===409){const value=await aborted.json() as{batchId?:string};if(value.batchId){const{data,error:readError}=await (await import('./supabase')).supabase.from('chat_messages').select('*').eq('id',value.batchId).single();if(!readError&&data){batchKeys.delete(files[0]);return hydrateChatMessageMedia(data as ChatMessage);}}}if(aborted?.ok)batchKeys.delete(files[0]);throw error;}
}

export async function uploadPrivateRoomAvatar(roomId:string,file:File){
  const normalized=await normalizeChatImageForUpload(file),access=await requireCurrentWebAccess(),state=keys(roomId,null,[file]);
  const metadata={kind:'room-avatar',batchId:state.batchId,roomId,replyToId:null,expectedCount:1,position:0,fileName:normalized.name,mimeType:normalized.type.toLowerCase(),size:normalized.size};
  const response=await uploadPart(access,normalized,metadata,state.retryKeys[0]),value=await payload(response,'Oda fotoğrafı yüklenemedi.');
  if(value.state!=='committed'||typeof value.fileVersionId!=='string'||typeof value.avatarAlias!=='string')throw new Error('Oda fotoğrafı yanıtı geçersiz.');batchKeys.delete(file);
  return{alias:value.avatarAlias as string,cleanupPending:Boolean(value.cleanupPending)};
}

export async function deletePrivateChatMessage(messageId:string){
  const access=await requireCurrentWebAccess(),retryKey=deleteKeys.get(messageId)??crypto.randomUUID();deleteKeys.set(messageId,retryKey);
  const response=await authenticatedWebFetch(`${origin()}/functions/v1/chat-media-lifecycle`,{method:'DELETE',headers:{'Content-Type':'application/json','Idempotency-Key':retryKey},body:JSON.stringify({messageId})},access);
  const value=await payload(response,'Görsel mesaj silinemedi.');if(!value.deleted)throw new Error('Görsel mesaj silme sonucu geçersiz.');if(!value.cleanupPending)deleteKeys.delete(messageId);return{cleanupPending:Boolean(value.cleanupPending)};
}

export function privateChatMediaVersionId(value:string|null|undefined){const match=value?.match(/^r2_chat_([0-9a-f-]{36})$/i);return match?.[1]??null;}
