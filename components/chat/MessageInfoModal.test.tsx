import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchStatuses: vi.fn() }));
vi.mock('@/lib/chat', () => ({ fetchMessageStatuses: mocks.fetchStatuses }));
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

import { MessageInfoModal } from './MessageInfoModal';

describe('MessageInfoModal status loading', () => {
  beforeEach(() => vi.clearAllMocks());

  it('distinguishes a load failure from an empty durable result and retries', async () => {
    mocks.fetchStatuses
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce([]);
    render(<MessageInfoModal messageId="message-1" onClose={vi.fn()} />);

    expect(await screen.findByText('Mesaj bilgisi yüklenemedi.')).toBeInTheDocument();
    expect(screen.queryByText('Henüz bilgi yok')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    await waitFor(() => expect(mocks.fetchStatuses).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Henüz bilgi yok')).toBeInTheDocument();
  });
});
