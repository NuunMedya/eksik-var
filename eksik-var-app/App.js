import React, { useEffect, useState } from "react";
import { loadPrefs } from "./src/prefs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "./src/ErrorBoundary";
import { isLive } from "./src/config";
import DemoApp from "./src/DemoApp";
import LiveApp from "./src/live/LiveApp";
import { izlemeBaslat, sentryWrap } from "./src/izleme";

izlemeBaslat();

// src/config.js doluysa Supabase ile (canlı), boşsa örnek verilerle (demo) çalışır
function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => { loadPrefs().finally(() => setReady(true)); }, []);
  if (!ready) return null;
  return (
    <ErrorBoundary>
      <SafeAreaProvider>{isLive() ? <LiveApp /> : <DemoApp />}</SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default sentryWrap(App);
