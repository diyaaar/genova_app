const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface AssignmentReviewFileTicketPayload{version:1;kind:'assignment-review-version';fileId:string;choirId:string;actorId:string;expiresAt:number}
const encode=(bytes:Uint8Array)=>{let binary='';for(const value of bytes)binary+=String.fromCharCode(value);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const decode=(value:string)=>{const normalized=value.replace(/-/g,'+').replace(/_/g,'/');const binary=atob(normalized+'='.repeat((4-normalized.length%4)%4));return Uint8Array.from(binary,c=>c.charCodeAt(0));};
async function key(secret:string){if(!secret)throw new Error('Missing ticket secret');return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function createAssignmentReviewFileTicket(input:{fileId:string;choirId:string;actorId:string},secret:string,ttlMs=60*60_000,now=Date.now()){
  if(!UUID.test(input.fileId)||!UUID.test(input.choirId)||!UUID.test(input.actorId)||ttlMs<=0)throw new Error('Invalid ticket input');
  const payload:AssignmentReviewFileTicketPayload={version:1,kind:'assignment-review-version',...input,expiresAt:now+ttlMs};
  const encoded=encode(new TextEncoder().encode(JSON.stringify(payload))),signature=await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode(encoded));
  return{token:`${encoded}.${encode(new Uint8Array(signature))}`,expiresAt:payload.expiresAt};
}
export async function verifyAssignmentReviewFileTicket(token:string,secret:string,now=Date.now()):Promise<AssignmentReviewFileTicketPayload|null>{
  const parts=token.split('.');if(parts.length!==2)return null;
  try{const valid=await crypto.subtle.verify('HMAC',await key(secret),decode(parts[1]),new TextEncoder().encode(parts[0]));if(!valid)return null;
    const value=JSON.parse(new TextDecoder().decode(decode(parts[0]))) as Partial<AssignmentReviewFileTicketPayload>;
    return value.version===1&&value.kind==='assignment-review-version'&&typeof value.fileId==='string'&&UUID.test(value.fileId)&&
      typeof value.choirId==='string'&&UUID.test(value.choirId)&&typeof value.actorId==='string'&&UUID.test(value.actorId)&&
      typeof value.expiresAt==='number'&&Number.isFinite(value.expiresAt)&&value.expiresAt>now?value as AssignmentReviewFileTicketPayload:null;
  }catch{return null;}
}
