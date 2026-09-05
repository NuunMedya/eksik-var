import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Share, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { Avatar } from "../components";
import { posIcon } from "../data";
import { makeTeams, avg, lineupText, TEAM_NAMES } from "../lineup";

export default function LineupScreen({ title, players, onBack, onSend }) {
  const [mode, setMode] = useState("dengeli");
  const [teams, setTeams] = useState(() => makeTeams(players, "dengeli"));
  const reroll = (m = mode) => setTeams(makeTeams(players, m));
  const text = lineupText(title, teams);
  const diff = Math.abs(avg(teams.A) - avg(teams.B));

  const TeamCard = ({ t, team, color, soft }) => (
    <View style={[st.team, { borderColor: soft }]}>
      <View style={[st.teamHead, { backgroundColor: color }]}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{t.emoji} {t.name}</Text>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{team.length} kişi · ★ {avg(team)}</Text>
      </View>
      {team.map((p) => (
        <View key={p.id} style={st.row}>
          <Avatar name={p.name} uri={p.avatar} size={30} />
          <Text style={{ flex: 1, marginLeft: 8, fontWeight: "700", fontSize: 13, color: C.ink }} numberOfLines={1}>{p.name}</Text>
          {(p.positions || []).slice(0, 1).map((id) => <Text key={id} style={{ fontSize: 12 }}>{posIcon(id)}</Text>)}
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint, marginLeft: 6 }}>{p.rating || "–"}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>Kura</Text>
          <Text style={{ color: C.mist, fontSize: 11 }} numberOfLines={1}>{title} · {players.length} oyuncu</Text>
        </View>
        <TouchableOpacity onPress={() => Share.share({ message: text }).catch(() => {})} style={st.iconBtn}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={st.modes}>
        {[["dengeli", "Dengeli (puana göre)"], ["rastgele", "Tamamen rastgele"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => { setMode(id); reroll(id); }} style={[st.modeBtn, mode === id && st.modeOn]}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: mode === id ? "#fff" : C.ink }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TeamCard t={TEAM_NAMES[0]} team={teams.A} color={C.pitch} soft={C.pitchSoft} />
          <TeamCard t={TEAM_NAMES[1]} team={teams.B} color={C.kit} soft={C.kitSoft} />
        </View>
        <Text style={st.note}>
          {mode === "dengeli"
            ? `Ortalama farkı ★ ${diff.toFixed(2)} · kaleciler ayrı takımlarda. Beğenmediysen yeniden karıştır.`
            : "Şans işi — puanlara bakılmadı."}
        </Text>
      </ScrollView>

      <View style={st.bottomBar}>
        <TouchableOpacity onPress={() => reroll()} style={[st.btn, { backgroundColor: C.pitchSoft }]}>
          <Ionicons name="shuffle" size={18} color={C.turf} />
          <Text style={[st.btnText, { color: C.turf }]}>Yeniden karıştır</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onSend(text)} style={[st.btn, { backgroundColor: C.turf }]}>
          <Ionicons name="send" size={16} color="#fff" />
          <Text style={[st.btnText, { color: "#fff" }]}>Gruba gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  modes: { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingTop: 12 },
  modeBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff", borderWidth: 1, borderColor: C.line },
  modeOn: { backgroundColor: C.turf, borderColor: C.turf },
  team: { flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  teamHead: { paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  note: { fontSize: 12, color: C.faint, textAlign: "center", marginTop: 14, lineHeight: 17 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line, padding: 14 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 13 },
  btnText: { fontWeight: "900", fontSize: 14 },
});
