import { registerRootComponent } from 'expo';

const App = process.env.EXPO_PUBLIC_GENOVA_033_ACCEPTANCE === '1'
  ? require('./src/acceptance/composed-webview-runtime').default
  : require('./App').default;

registerRootComponent(App);
