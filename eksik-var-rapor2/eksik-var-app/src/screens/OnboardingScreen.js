import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, StyleSheet } from "react-native";
import { C } from "../theme";

const W = Dimensions.get("window").width;
const SLIDES = [
  { icon: "⚽", title: "\"Eksik var\" de, kadro dolsun", text: "İlçe, saha, saat ve kaç kişi eksik olduğunuz. 30 saniyede yayında; yakındaki oyunculara bildirim gider." },
  { icon: "🤝", title: "Başvur, çift onayla söz ver", text: "Organizatör onaylar, son sözü sen söylersin. Gelmeyen yoklamada işaretlenir; güvenilirlik puanı herkese görünür." },
  { icon: "👥", title: "Ekibini getir", text: "Haftalık maçını bir kez tanımla: \"Var mısın?\" sorusunu uygulama sorar, eksiği bulur, parayı ve yoklamayı takip eder. WhatsApp grubu sadece muhabbete kalır." },
];

export default function OnboardingScreen({ onDone }) {
  const [i, setI] = useState(0);
  const sc = useRef(null);
  const go = (n) => { setI(n); sc.current && sc.current.scrollTo({ x: n * W, animated: true }); };
  return (
    <View style={{ flex: 1, backgroundColor: C.turf }}>
      <View style={{ alignItems: "center", paddingTop: 40 }}>
        <Image source={require("../../assets/logo-mark.png")} style={{ width: 110, height: 110 }} resizeMode="contain" />
      </View>
      <ScrollView ref={sc} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / W))} style={{ flex: 1 }}>
        {SLIDES.map((s, k) => (
          <View key={k} style={{ width: W, paddingHorizontal: 32, justifyContent: "center" }}>
            <Text style={{ fontSize: 56, textAlign: "center" }}>{s.icon}</Text>
            <Text style={st.title}>{s.title}</Text>
            <Text style={st.text}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 18 }}>
        {SLIDES.map((_, k) => <View key={k} style={[st.dot, i === k && { backgroundColor: C.kit, width: 22 }]} />)}
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 36, flexDirection: "row", gap: 10 }}>
        <TouchableOpacity onPress={onDone} style={[st.btn, { backgroundColor: "rgba(255,255,255,0.14)" }]}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>Geç</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => (i < SLIDES.length - 1 ? go(i + 1) : onDone())} style={[st.btn, { flex: 2, backgroundColor: C.pitch }]}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>{i < SLIDES.length - 1 ? "Devam" : "Başla"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  title: { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center", marginTop: 14, lineHeight: 30 },
  text: { color: C.mist, fontSize: 15, textAlign: "center", marginTop: 10, lineHeight: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.3)" },
  btn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14 },
});
