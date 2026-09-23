export interface ChatMediaTicketPayload{version:1;kind:'chat-media-version';fileId:string;choirId:string;actorId:string;expiresAt:number}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function encodeBase64Url(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/u,'');}
function decodeBase64Url(value:string){if(!/^[A-Za-z0-9_-]+$/u.test(value))throw new Error('Invalid base64url');const padded=value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'=');const binary=atob(padded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
async function key(secret:string){return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function createChatMediaTicket(input:{fileId:string;choirId:string;actorId:string},secret:string,ttlMs=60_000,now=Date.now()){
  if(!UUID.test(input.fileId)||!UUID.test(input.choirId)||!UUID.test(input.actorId)||ttlMs<=0)throw new Error('Invalid ticket input');
  const payload:ChatMediaTicketPayload={version:1,kind:'chat-media-version',...input,expiresAt:now+ttlMs};
  const encoded=encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload))),signature=await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode(encoded));
  return{token:`${encoded}.${encodeBase64Url(new Uint8Array(signature))}`,expiresAt:payload.expiresAt};
}
export async function verifyChatMediaTicket(token:string,secret:string,now=Date.now()):Promise<ChatMediaTicketPayload|null>{
  const parts=token.split('.');if(parts.length!==2)return null;
  try{const valid=await crypto.subtle.verify('HMAC',await key(secret),decodeBase64Url(parts[1]),new TextEncoder().encode(parts[0]));if(!valid)return null;
    const value=JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])))as Partial<ChatMediaTicketPayload>;
    return value.version===1&&value.kind==='chat-media-version'&&typeof value.fileId==='string'&&UUID.test(value.fileId)&&typeof value.choirId==='string'&&UUID.test(value.choirId)&&typeof value.actorId==='string'&&UUID.test(value.actorId)&&typeof value.expiresAt==='number'&&Number.isFinite(value.expiresAt)&&value.expiresAt>now?value as ChatMediaTicketPayload:null;
  }catch{return null;}
}
