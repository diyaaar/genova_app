import { registerRootComponent } from 'expo';
import { bootSkia } from './src/skiaBoot';

// Platforma göre doğru bootSkia seçilir (skiaBoot.ts / skiaBoot.web.ts).
// Metro statik tarama yaptığı için web'e özel import'u Platform.OS kontrolüyle
// gizleyemezsin — dosya ayrımı şart.
bootSkia().then(() => {
  const App = require('./App').default;
  registerRootComponent(App);
});
