import {
  createChatReadScope,
  isChatReadScopeCurrent,
  parseChatReadMessage,
} from '@shared/chat-read-contract';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const CHOIR_ID = '20000000-0000-4000-8000-000000000002';
const MEMBER_ID = '30000000-0000-4000-8000-000000000003';
const ROOM_ID = '40000000-0000-4000-8000-000000000004';
const MESSAGE_ID = '60000000-0000-4000-8000-000000000006';
const SENDER_ID = '70000000-0000-4000-8000-000000000007';

describe('mobile shared chat read contract import', () => {
  it('uses the shared scope guard without a React Native mirror', () => {
    const current = createChatReadScope({ userId: USER_ID, choirId: CHOIR_ID, memberId: MEMBER_ID });
    expect(current).not.toBeNull();
    if (!current) throw new Error('fixture scope rejected');
    expect(isChatReadScopeCurrent({ ...current }, current)).toBe(true);
    expect(isChatReadScopeCurrent({ ...current, memberId: SENDER_ID }, current)).toBe(false);
  });

  it('keeps a future compatible message kind explicit for the native fallback UI', () => {
    const result = parseChatReadMessage({
      id: MESSAGE_ID,
      room_id: ROOM_ID,
      sender_id: SENDER_ID,
      content: null,
      message_type: 'future_score_marker',
      reply_to_id: null,
      metadata_json: { label: 'Yeni mesaj türü' },
      is_edited: false,
      is_deleted: false,
      created_at: '2026-09-19T12:00:00.123456Z',
      updated_at: '2026-09-19T12:00:00.123456Z',
      sender: null,
      reply_to: null,
    }, ROOM_ID);

    expect(result).toMatchObject({
      kind: 'accepted',
      value: {
        messageType: 'unsupported',
        sourceMessageType: 'future_score_marker',
        isMessageTypeSupported: false,
      },
    });
  });
});
