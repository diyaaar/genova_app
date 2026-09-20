import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ChatReadMessage } from '@shared/chat-read-contract';
import { ChatStarredMessagesPanel } from '../ChatStarredMessagesPanel';

const message: ChatReadMessage = {
  id: '55555555-5555-4555-8555-555555555555',
  clientMutationId: null,
  roomId: '44444444-4444-4444-8444-444444444444',
  senderId: '66666666-6666-4666-8666-666666666666',
  content: 'Prova saat dokuzda.',
  messageType: 'text',
  sourceMessageType: 'text',
  isMessageTypeSupported: true,
  replyToId: null,
  metadata: {},
  isEdited: false,
  isDeleted: false,
  createdAt: '2026-09-20T09:00:00.000000Z',
  updatedAt: '2026-09-20T09:00:00.000000Z',
  sender: {
    id: '66666666-6666-4666-8666-666666666666',
    firstName: 'Ada',
    lastName: 'Lovelace',
    photoUrl: null,
  },
  replyTo: null,
};

function props() {
  return {
    items: [{
      starId: '77777777-7777-4777-8777-777777777777',
      starredAt: '2026-09-20T10:00:00.000000Z',
      message,
    }],
    loading: false,
    error: null,
    hasMore: true,
    busyIds: new Set<string>(),
    onRefresh: jest.fn(),
    onLoadOlder: jest.fn(),
    onToggle: jest.fn(),
    onClose: jest.fn(),
  };
}

describe('ChatStarredMessagesPanel', () => {
  it('exposes refresh, older paging, removal and close controls for an accepted page', async () => {
    const input = props();
    await render(<ChatStarredMessagesPanel {...input} />);

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Prova saat dokuzda.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-starred-refresh'));
    await fireEvent.press(screen.getByTestId('chat-starred-older'));
    await fireEvent.press(screen.getByTestId(`chat-starred-remove-${message.id}`));
    await fireEvent.press(screen.getByTestId('chat-starred-close'));
    expect(input.onRefresh).toHaveBeenCalledTimes(1);
    expect(input.onLoadOlder).toHaveBeenCalledTimes(1);
    expect(input.onToggle).toHaveBeenCalledWith(message);
    expect(input.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps loading, error and empty states explicit', async () => {
    const input = props();
    const view = await render(<ChatStarredMessagesPanel {...input} items={null} loading />);
    expect(screen.getByTestId('chat-starred-loading')).toBeTruthy();

    await view.rerender(<ChatStarredMessagesPanel {...input} items={[]} error="Güncel veri alınamadı." />);
    expect(screen.getByTestId('chat-starred-error')).toHaveTextContent('Güncel veri alınamadı.');
    expect(screen.getByTestId('chat-starred-empty')).toBeTruthy();
  });
});
