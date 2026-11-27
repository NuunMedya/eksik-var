// Eksik Var — renk paleti. Açık ve koyu tema; C nesnesi yerinde güncellenir, stil tabloları onThemeChange ile yeniden kurulur.
// react-native yalnızca uygulamada var; Node testlerinde sistem teması "light" kabul edilir
let Appearance = null;
try { Appearance = typeof require === "function" ? require("react-native").Appearance : null; } catch { Appearance = null; }

export const LIGHT = {
  // "Gece maçı" paleti: antrasit-lacivert, elektrik yeşili, çelik mavisi. Krem/turuncu yok.
  turf: "#0B1220", turfLight: "#1A2438", turfText: "#0B1220",
  pitch: "#0FA958", pitchSoft: "#DCF3E5", pitchDark: "#0B1220",
  chalk: "#EEF1F5",            // uygulama zemini (soğuk çelik grisi)
  surface: "#FFFFFF",          // kart / giriş kutusu yüzeyi
  kit: "#2563EB", kitSoft: "#DCE7FF",   // ikincil vurgu: elektrik mavisi
  star: "#F5B301",
  ink: "#0B1220", faint: "#5B6572", line: "#D7DDE6",
  waBg: "#E6EAF0", waMine: "#DCF3E5", waNotice: "#E8EDF5",
  mist: "#9FB3C8", gray: "#94A3B8", danger: "#DC2626",
  placeholder: "#94A3B8", isDark: false,
};
export const DARK = {
  turf: "#05080F", turfLight: "#141C2B", turfText: "#5EE39A",
  pitch: "#22D36B", pitchSoft: "#0F2A1C", pitchDark: "#05080F",
  chalk: "#090D14",
  surface: "#121826",
  kit: "#4F8BFF", kitSoft: "#132446",
  star: "#F5B301",
  ink: "#E6EAF0", faint: "#94A3B8", line: "#1F2937",
  waBg: "#090D14", waMine: "#0F2A1C", waNotice: "#1A2233",
  mist: "#9FB3C8", gray: "#64748B", danger: "#FF6B6B",
  placeholder: "#64748B", isDark: true,
};

export const C = { ...LIGHT };
let mode = "system";                    // system | light | dark
const listeners = new Set();
export const onThemeChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getThemeMode = () => mode;
export const isDarkNow = () => C.isDark;
export function applyTheme(next) {
  mode = next || "system";
  const dark = mode === "dark" || (mode === "system" && Appearance && Appearance.getColorScheme() === "dark");
  Object.keys(C).forEach((k) => delete C[k]);
  Object.assign(C, dark ? DARK : LIGHT);
  listeners.forEach((fn) => { try { fn(C); } catch { /* sessiz */ } });
}
if (Appearance && Appearance.addChangeListener) Appearance.addChangeListener(() => { if (mode === "system") applyTheme("system"); });
