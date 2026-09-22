const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface AssignmentFileTicketPayload {
  version:1;kind:'assignment-version';fileId:string;choirId:string;expiresAt:number;
}
function encode(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/u,'');}
function decode(value:string){if(!/^[A-Za-z0-9_-]+$/u.test(value))return null;try{const padded=value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'=');
  const binary=atob(padded),bytes=new Uint8Array(binary.length);for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);return bytes;}catch{return null;}}
async function key(secret:string){if(!secret)throw new Error('Missing ticket secret');return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function createAssignmentFileTicket(input:{fileId:string;choirId:string},secret:string,ttlMs=60*60_000,now=Date.now()){
  if(!UUID.test(input.fileId)||!UUID.test(input.choirId)||ttlMs<=0)throw new Error('Invalid ticket input');
  const payload:AssignmentFileTicketPayload={version:1,kind:'assignment-version',fileId:input.fileId,choirId:input.choirId,expiresAt:now+ttlMs};
  const encoded=encode(new TextEncoder().encode(JSON.stringify(payload))),signature=await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode(encoded));
  return{token:`${encoded}.${encode(new Uint8Array(signature))}`,expiresAt:payload.expiresAt};}
export async function verifyAssignmentFileTicket(token:string,secret:string,now=Date.now()):Promise<AssignmentFileTicketPayload|null>{
  const parts=token.split('.');if(parts.length!==2)return null;const payloadBytes=decode(parts[0]),signature=decode(parts[1]);if(!payloadBytes||!signature)return null;
  try{const valid=await crypto.subtle.verify('HMAC',await key(secret),signature,new TextEncoder().encode(parts[0]));if(!valid)return null;
    const payload=JSON.parse(new TextDecoder().decode(payloadBytes))as Partial<AssignmentFileTicketPayload>;
    return payload.version===1&&payload.kind==='assignment-version'&&typeof payload.fileId==='string'&&UUID.test(payload.fileId)&&
      typeof payload.choirId==='string'&&UUID.test(payload.choirId)&&typeof payload.expiresAt==='number'&&Number.isFinite(payload.expiresAt)&&payload.expiresAt>now
      ? payload as AssignmentFileTicketPayload:null;}catch{return null;}}
