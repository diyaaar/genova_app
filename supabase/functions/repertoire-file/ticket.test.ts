import { describe, expect, it } from 'vitest';
import { createRepertoireFileTicket, verifyRepertoireFileTicket } from './ticket';

const fileId = '11111111-1111-4111-8111-111111111111';
const choirId = '22222222-2222-4222-8222-222222222222';

describe('repertoire file tickets', () => {
  it('round-trips only the bound repository file, choir and expiry', async () => {
    const issued = await createRepertoireFileTicket({ fileId, choirId }, 'secret', 1_000, 5_000);
    const payload = await verifyRepertoireFileTicket(issued.token, 'secret', 5_999);

    expect(issued.expiresAt).toBe(6_000);
    expect(payload).toEqual({ version: 1, fileId, choirId, expiresAt: 6_000 });
    expect(issued.token).not.toContain('drive.google.com');
    expect(issued.token).not.toContain('storage://');
  });

  it('rejects tampering, a different secret and malformed tokens', async () => {
    const issued = await createRepertoireFileTicket({ fileId, choirId }, 'secret', 1_000, 5_000);
    const [body, signature] = issued.token.split('.');

    expect(await verifyRepertoireFileTicket(`${body}x.${signature}`, 'secret', 5_100)).toBeNull();
    expect(await verifyRepertoireFileTicket(issued.token, 'other-secret', 5_100)).toBeNull();
    expect(await verifyRepertoireFileTicket('not-a-ticket', 'secret', 5_100)).toBeNull();
  });

  it('rejects a ticket at and after its expiry boundary', async () => {
    const issued = await createRepertoireFileTicket({ fileId, choirId }, 'secret', 1_000, 5_000);

    expect(await verifyRepertoireFileTicket(issued.token, 'secret', 6_000)).toBeNull();
    expect(await verifyRepertoireFileTicket(issued.token, 'secret', 6_001)).toBeNull();
  });

  it('refuses invalid IDs, non-positive lifetimes and an empty secret', async () => {
    await expect(createRepertoireFileTicket({ fileId: 'drive-id', choirId }, 'secret'))
      .rejects.toThrow('Invalid ticket input');
    await expect(createRepertoireFileTicket({ fileId, choirId }, 'secret', 0))
      .rejects.toThrow('Invalid ticket input');
    await expect(createRepertoireFileTicket({ fileId, choirId }, ''))
      .rejects.toThrow('Missing ticket secret');
  });
});
