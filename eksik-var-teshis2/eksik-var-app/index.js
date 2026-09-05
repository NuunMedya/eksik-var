/* GEÇİCİ TEŞHİS v2: React 19'un captureOwnerStack API'siyle hatanın
   bileşen zincirini terminale basar. Suçlu bulununca silinecek. */
import * as React from "react";
const __eskiHata = console.error;
console.error = (...a) => {
  __eskiHata(...a);
  if (a.some((x) => String(x).includes("Text strings must be rendered"))) {
    try {
      const zincir = React.captureOwnerStack && React.captureOwnerStack();
      __eskiHata("═══ SAHİP ZİNCİRİ ═══" + (zincir || " (zincir boş döndü)"));
    } catch (e) { __eskiHata("═══ zincir alınamadı: " + e.message); }
  }
};

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
