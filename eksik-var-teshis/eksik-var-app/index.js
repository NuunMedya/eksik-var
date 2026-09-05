/* GEÇİCİ TEŞHİS: "Text strings..." hatasının bileşen zincirini terminale tam basar.
   Suçlu bulununca bu blok silinecek. */
const __eskiHata = console.error;
console.error = (...a) => {
  __eskiHata(...a);
  if (a.some((x) => String(x).includes("Text strings must be rendered"))) {
    __eskiHata("═══ TEŞHİS DÖKÜMÜ ═══\n" + a.map((x) => String(x)).join("\n───\n"));
  }
};

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
