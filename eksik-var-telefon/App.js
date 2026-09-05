import React from "react";
import { isLive } from "./src/config";
import DemoApp from "./src/DemoApp";
import LiveApp from "./src/live/LiveApp";

// src/config.js doluysa Supabase ile (canlı), boşsa örnek verilerle (demo) çalışır
export default function App() {
  return isLive() ? <LiveApp /> : <DemoApp />;
}
