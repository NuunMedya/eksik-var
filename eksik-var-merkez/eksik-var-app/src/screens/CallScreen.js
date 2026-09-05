import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function CallScreen({ call, onEnd }) {
  const [status, setStatus] = useState("aranıyor"); // aranıyor | bağlandı
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const secondsRef = useRef(0);

  useEffect(() => {
    // Demo: 2,5 saniye sonra karşı taraf açıyor. Gerçek arama Supabase + WebRTC ile bağlanacak.
    const t = setTimeout(() => setStatus("bağlandı"), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== "bağlandı") return;
    const i = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    return () => clearInterval(i);
  }, [status]);

  return (
    <View style={st.wrap}>
      <View style={{ alignItems: "center", marginTop: 60 }}>
        <Text style={st.kicker}>{t("UYGULAMA İÇİ ARAMA")}</Text>
        <View style={st.avatarRing}>
          <Avatar name={call.name} uri={call.avatar} size={112} />
        </View>
        <Text style={st.name}>{call.name}</Text>
        <Text style={st.status}>
          {status === "aranıyor" ? "Aranıyor…" : fmt(seconds)}
        </Text>
        <View style={st.privacy}>
          <Ionicons name="shield-checkmark" size={13} color={C.mist} />
          <Text style={{ color: C.mist, fontSize: 12 }}>{t("Numaralar gizli · uçtan uca uygulama içi")}</Text>
        </View>
      </View>

      <View style={st.controls}>
        <TouchableOpacity onPress={() => setMuted((m) => !m)} style={[st.ctrl, muted && st.ctrlOn]}>
          <Ionicons name={muted ? "mic-off" : "mic"} size={26} color={muted ? C.turfText : "#fff"} />
          <Text style={[st.ctrlLabel, muted && { color: C.turfText }]}>{muted ? "Sessizde" : "Sessize al"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onEnd(status === "bağlandı" ? secondsRef.current : 0)} style={st.end}>
          <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSpeaker((s) => !s)} style={[st.ctrl, speaker && st.ctrlOn]}>
          <Ionicons name={speaker ? "volume-high" : "volume-medium"} size={26} color={speaker ? C.turfText : "#fff"} />
          <Text style={[st.ctrlLabel, speaker && { color: C.turfText }]}>{t("Hoparlör")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.turf, justifyContent: "space-between", paddingBottom: 48 },
  kicker: { color: C.mist, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 24 },
  avatarRing: {
    padding: 6, borderRadius: 70, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", marginBottom: 18,
  },
  name: { color: "#fff", fontSize: 26, fontWeight: "900" },
  status: { color: C.mist, fontSize: 18, fontWeight: "600", marginTop: 6, fontVariant: ["tabular-nums"] },
  privacy: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 22 },
  controls: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 34, paddingHorizontal: 24,
  },
  ctrl: {
    width: 76, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  ctrlOn: { backgroundColor: C.surface },
  ctrlLabel: { color: "#fff", fontSize: 11, fontWeight: "700" },
  end: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: C.danger,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
