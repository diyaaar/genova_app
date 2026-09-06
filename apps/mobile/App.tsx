import { AuthProvider } from './src/auth/AuthProvider';
import { AppRoot } from './src/ui/AppRoot';

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
