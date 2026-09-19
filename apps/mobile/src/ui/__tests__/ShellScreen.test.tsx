import { fireEvent, render, screen } from '@testing-library/react-native';
import { membership } from '../../test/doubles';
import { ShellScreen } from '../ShellScreen';

function renderShell(notification?: React.ComponentProps<typeof ShellScreen>['notification']) {
  return render(
    <ShellScreen
      activeChoir={membership()}
      canSwitchChoir={false}
      notification={notification}
      onOpenRepertoire={jest.fn()}
      onOpenWeb={jest.fn()}
      onSwitchChoir={jest.fn()}
      onSignOut={jest.fn()}
    />,
  );
}

describe('ShellScreen notification permission UI', () => {
  it('shows no notification control when no native gateway is composed', async () => {
    await renderShell();
    expect(screen.queryByTestId('shell-notification-card')).toBeNull();
  });

  it('shows denial without requesting again until the user presses', async () => {
    const onRequest = jest.fn();
    await renderShell({
      permission: 'denied',
      requesting: false,
      message: 'Bildirim izni verilmedi.',
      onRequest,
    });

    expect(screen.getByTestId('shell-notification-status')).toHaveTextContent('İzin verilmedi');
    expect(screen.getByTestId('shell-notification-message')).toHaveTextContent('Bildirim izni verilmedi.');
    expect(onRequest).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('shell-request-notification-permission'));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });
});
