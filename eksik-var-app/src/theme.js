// Eksik Var — renk paleti. Açık ve koyu tema; C nesnesi yerinde güncellenir, stil tabloları onThemeChange ile yeniden kurulur.
// react-native yalnızca uygulamada var; Node testlerinde sistem teması "light" kabul edilir
let Appearance = null;
try { Appearance = typeof require === "function" ? require("react-native").Appearance : null; } catch { Appearance = null; }

export const LIGHT = {
  // "Gece maçı" paleti, yumuşatılmış: koyu arduvaz lacivert, dengeli çim yeşili, yumuşak çelik mavisi.
  turf: "#1B2838", turfLight: "#28394F", turfText: "#1B2838",
  pitch: "#2E9E68", pitchSoft: "#E1F2E9", pitchDark: "#1B2838",
  chalk: "#F2F4F7",            // uygulama zemini (açık çelik grisi)
  surface: "#FFFFFF",          // kart / giriş kutusu yüzeyi
  kit: "#3F7FDB", kitSoft: "#E3ECFA",   // ikincil vurgu: yumuşak mavi
  star: "#E8AD1C",
  ink: "#1C2733", faint: "#66717E", line: "#DEE3EA",
  waBg: "#EAEEF3", waMine: "#E1F2E9", waNotice: "#EAEEF3",
  mist: "#A9B8C9", gray: "#9AA6B4", danger: "#D04A4A",
  placeholder: "#9AA6B4", isDark: false,
};
export const DARK = {
  turf: "#111A26", turfLight: "#1C2838", turfText: "#7FD4A5",
  pitch: "#3DBF7A", pitchSoft: "#173125", pitchDark: "#111A26",
  chalk: "#0F1620",
  surface: "#182233",
  kit: "#6B9BFF", kitSoft: "#1C2B48",
  star: "#E8AD1C",
  ink: "#E6EAF0", faint: "#9AA8B8", line: "#263245",
  waBg: "#0F1620", waMine: "#173125", waNotice: "#1C2838",
  mist: "#A9B8C9", gray: "#6B7A8C", danger: "#FF7B7B",
  placeholder: "#6B7A8C", isDark: true,
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
