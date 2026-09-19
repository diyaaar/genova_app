import { AuthProvider } from './src/auth/AuthProvider';
import { createExpoNotificationGateway } from './src/notifications/notification-gateway';
import { AppRoot } from './src/ui/AppRoot';

const notificationGateway = createExpoNotificationGateway();

export default function App() {
  return (
    <AuthProvider>
      <AppRoot notificationGateway={notificationGateway} />
    </AuthProvider>
  );
}
