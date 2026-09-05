import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { isLive } from "./src/config";
import DemoApp from "./src/DemoApp";
import LiveApp from "./src/live/LiveApp";

// src/config.js doluysa Supabase ile (canlı), boşsa örnek verilerle (demo) çalışır
export default function App() {
  return <SafeAreaProvider>{isLive() ? <LiveApp /> : <DemoApp />}</SafeAreaProvider>;
}
