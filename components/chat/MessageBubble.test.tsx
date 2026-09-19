import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@/lib/chat';

const failedMessage: ChatMessage = {
  id: 'temp-00000000-0000-4000-8000-000000000001',
  client_mutation_id: '00000000-0000-4000-8000-000000000001',
  room_id: 'room-1',
  sender_id: 'member-1',
  content: 'Tekrar gönderilecek mesaj',
  message_type: 'text',
  reply_to_id: null,
  metadata_json: { _status: 'failed', _failed: true },
  is_edited: false,
  is_deleted: false,
  created_at: '2026-09-19T12:00:00.000Z',
  updated_at: '2026-09-19T12:00:00.000Z',
  sender: { id: 'member-1', first_name: 'Ada', last_name: 'Lovelace', photo_url: null },
};

describe('MessageBubble pending text controls', () => {
  it('exposes explicit retry and cancel actions only for the failed sender bubble', () => {
    const onRetry = vi.fn();
    const onCancelPending = vi.fn();
    const { rerender } = render(
      <MessageBubble
        message={failedMessage}
        isOwn
        showSender={false}
        currentMemberId="member-1"
        onRetry={onRetry}
        onCancelPending={onCancelPending}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
    expect(screen.getByText('Gönderilemedi · 7 gün saklanır')).toBeInTheDocument();
    expect(onRetry).toHaveBeenCalledWith(failedMessage);
    expect(onCancelPending).toHaveBeenCalledWith(failedMessage);

    rerender(
      <MessageBubble
        message={{ ...failedMessage, metadata_json: {} }}
        isOwn
        showSender={false}
        currentMemberId="member-1"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Tekrar dene' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'İptal' })).toBeNull();
  });
});
