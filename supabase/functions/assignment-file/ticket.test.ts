import { describe,expect,it } from 'vitest';
import { createAssignmentFileTicket,verifyAssignmentFileTicket } from './ticket';
const fileId='70000000-0000-4000-8000-000000000057',choirId='20000000-0000-4000-8000-000000000057',secret='synthetic-secret';
describe('057 assignment file ticket domain',()=>{
  it('round-trips only an assignment-version ticket',async()=>{const value=await createAssignmentFileTicket({fileId,choirId},secret,1000,10);
    expect(await verifyAssignmentFileTicket(value.token,secret,11)).toEqual({version:1,kind:'assignment-version',fileId,choirId,expiresAt:1010});});
  it('rejects expiration and tampering',async()=>{const value=await createAssignmentFileTicket({fileId,choirId},secret,10,10);
    expect(await verifyAssignmentFileTicket(value.token,secret,20)).toBeNull();expect(await verifyAssignmentFileTicket(`${value.token}x`,secret,11)).toBeNull();});
  it('rejects a valid HMAC payload from the repertoire ticket domain',async()=>{const repertoirePayload=Buffer.from(JSON.stringify({version:1,fileId,choirId,expiresAt:1010})).toString('base64url');
    const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const signature=Buffer.from(await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode(repertoirePayload))).toString('base64url');
    expect(await verifyAssignmentFileTicket(`${repertoirePayload}.${signature}`,secret,11)).toBeNull();});
});
