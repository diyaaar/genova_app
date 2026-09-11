import * as Crypto from 'expo-crypto';

function base64Url(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += alphabet[first >>> 2];
    output += alphabet[((first & 3) << 4) | ((second ?? 0) >>> 4)];
    if (second !== undefined) output += alphabet[((second & 15) << 2) | ((third ?? 0) >>> 6)];
    if (third !== undefined) output += alphabet[third & 63];
  }
  return output;
}

export function createBridgeCorrelationId(): string {
  return Crypto.randomUUID();
}

/** 24 CSPRNG bytes exceed the contract's 128-bit challenge floor. */
export function createBridgeChallenge(): string {
  return base64Url(Crypto.getRandomBytes(24));
}

let tenantEpoch = 0;

/** Process-local monotonic epoch; identity/choir remount and explicit retry each allocate a new value. */
export function allocateTenantEpoch(): number {
  tenantEpoch += 1;
  return tenantEpoch;
}
