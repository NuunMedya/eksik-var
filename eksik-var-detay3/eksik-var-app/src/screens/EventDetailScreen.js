import React, { useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, StyleSheet, Alert, Share, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES, GUNLER_UZUN, positionSlots, posLabel, posIcon, venueModeLabel, costModeLabel, teamLabel, VARMISIN_OPTIONS, PAYMENT_LABEL, paymentSummary, formatLabel, relInfo, eventPhase } from "../data";
import { parseRoster } from "../roster";
import { Avatar, Stars, SquadDots, EksikBadge, BACK_ICON } from "../components";

export default function EventDetailScreen({ onUpdateDesc = null, onUpdateNeeds = null, onStopSeries = null,
  ev, apps, myApp, roster, onBack, onApply, onApprove, onReject, onGoChat, onAttendance, onDispute, onShare,
  onEdit = () => {}, onRepeat = null, onCancel = () => {}, onLeave = () => {}, onRate = () => {}, rated = false, onOrganizer = () => {},
  onAcceptInvite = () => {}, onDeclineInvite = () => {}, onJoinWaitlist = () => {}, onLeaveWaitlist = () => {},
  availability = null, onAskAvailability = () => {}, onApplySuggested = () => {}, onAnswer = () => {},
  onRecordScore = () => {}, myMvpVote = null,
  onClaimPayment = () => {}, onConfirmPayment = () => {}, onSendIban = () => {}, onRemindPayments = () => {}, onCopyIban = () => {},
  onCalendar = () => {}, onDirections = () => {}, onAddGuest = () => {}, onAddGuests = null, onRemoveGuest = () => {}, onToggleGuest = () => {},
  onCheckIn = () => {}, disputes = [], onFixAttendance = () => {}, onConfirmAllPayments = () => {},
  statRoster = [], onSetStat = () => {}, onShareSummary = () => {}, checkinCode = null, onOpenCode = () => {}, onCheckInWithCode = () => {},
}) {
  const kadroRef = useRef(null);
  const [codeInput, setCodeInput] = React.useState("");
  const [openStats, setOpenStats] = React.useState(false);
  const stats = ev.stats || [];
  const statOf = (id) => stats.find((x) => x.id === id) || { goals: 0, assists: 0 };
  const phase = eventPhase(ev);
  const upcoming = phase === "acik" || phase === "dolu" || phase === "bugun";
  const [openDesc, setOpenDesc] = React.useState(upcoming);
  const [openPay, setOpenPay] = React.useState(phase === "tamamlandi" || phase === "oynandi");
  const [openApps, setOpenApps] = React.useState(upcoming);
  const [guestName, setGuestName] = React.useState("");
  const [guestPos, setGuestPos] = React.useState(null);
  const [ihEdit, setIhEdit] = React.useState(false);
  const [ihtiyac, setIhtiyac] = React.useState(null);
  const [rosterOpen, setRosterOpen] = React.useState(false);
  const [rosterText, setRosterText] = React.useState("");
  const rosterParsed = React.useMemo(() => parseRoster(rosterText), [rosterText]);
  const rosterConfirm = () => {
    if (!rosterParsed.length) return;
    if (onAddGuests) onAddGuests(ev.id, rosterParsed);
    else rosterParsed.forEach((p) => onAddGuest(ev.id, p.name, p.gk));
    setRosterOpen(false); setRosterText("");
  };
  const guests = ev.guests || [];
  const payList = ev.payments || [];
  const showPay = ev.price > 0 && ev.status !== "iptal" && ((ev.mine && payList.length > 0) || (!ev.mine && !!ev.myPayment));
  const [sh, setSh] = React.useState(""); const [sa, setSa] = React.useState("");
  const av = availability;
  const showAv = !!av && ev.status !== "iptal" && ev.status !== "tamamlandi" && !ev.ended && ev.kind !== "rakip";
  const showPositions = ev.status !== "tamamlandi" && !ev.ended && ev.status !== "iptal";
  const pendingInvite = myApp && myApp.invited && myApp.status === "orgBekliyor";
  const rakip = ev.kind === "rakip";
  const pendingOffer = pendingInvite && myApp.fromWaitlist;
  const canWaitlist = !ev.mine && !ev.joined && !myApp && !ev.ended && ev.status === "doldu";
  const shareable = ev.status === "acik" && ev.needed - ev.filled > 0;
  const manageable = ev.mine && !ev.ended && ev.status !== "iptal" && ev.status !== "tamamlandi";
  const canRate = ev.status === "tamamlandi" && (ev.joined || ev.mine);
  const marks = ev.attendance || {};
  const noShows = (roster || []).filter((m) => marks[m.id] === "gelmedi");
  const attended = (roster || []).filter((m) => marks[m.id] === "katildi");
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  const remaining = ev.needed - ev.filled;
  const eventApps = apps.filter((a) => a.eventId === ev.id && a.who !== "me");

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <TouchableOpacity onPress={onBack} style={st.back}>
            <Ionicons name={BACK_ICON} size={18} color={C.mist} />
            <Text style={{ color: C.mist, fontWeight: "700", fontSize: 13 }}>{t("Geri")}</Text>
          </TouchableOpacity>
          {shareable && (
            <TouchableOpacity onPress={() => onShare(ev)} style={st.shareBtn}>
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{t("Paylaş")}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 26 }}>{cat?.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[st.title, { flexShrink: 1 }]} numberOfLines={1}>{ev.title}</Text>
              <EksikBadge ev={ev} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
              <Ionicons name="location-outline" size={12} color={C.mist} />
              <Text style={{ color: C.mist, fontSize: 12.5, flexShrink: 1 }} numberOfLines={1}>
                {ev.venue} · {ev.district ? `${ev.district}, ` : ""}{ev.city}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        <View style={{ flexDirection: "row", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingVertical: 12, alignItems: "stretch" }}>
          {(rakip ? [
            ["calendar-outline", ev.date],
            ["people-outline", `${formatLabel(ev.cat, ev.format)} · ${ev.level}`],
            ["cash-outline", costModeLabel(ev.costMode)],
          ] : [
            ["calendar-outline", ev.date],
            ["cash-outline", ev.price === 0 ? "Ücretsiz" : `${ev.price}₺/kişi`],
            ["trophy-outline", `${ev.level}${ev.format ? ` · ${formatLabel(ev.cat, ev.format)}` : ""}`],
          ]).map(([icon, text], i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: C.line }}>
              <Ionicons name={icon} size={17} color={i === 1 ? C.kit : C.pitch} />
              <Text style={{ fontSize: 11.5, fontWeight: "900", color: C.ink, marginTop: 4, textAlign: "center" }} numberOfLines={2}>
                {text}
              </Text>
            </View>
          ))}
        </View>

        {rakip && (
          <View style={[st.card, { borderLeftWidth: 4, borderLeftColor: C.kit }]}>
            <Text style={st.cardTitle}>{t("RAKİP ARAYAN TAKIM")}</Text>
            <Text style={{ fontSize: 18, fontWeight: "900", color: C.ink, marginTop: 6 }}>{ev.teamName}</Text>
            <Text style={{ fontSize: 13, color: C.faint, marginTop: 2 }}>
              {formatLabel(ev.cat, ev.format)} · {ev.level} · {venueModeLabel(ev.venueMode)}{ev.venue ? ` (${ev.venue})` : ""} · {costModeLabel(ev.costMode)}
            </Text>
            {ev.filled >= ev.needed && (
              <Text style={{ fontSize: 13, fontWeight: "800", color: C.pitch, marginTop: 8 }}>
                {t("🆚 Maç ayarlandı · saha ve ücret detaylarını kaptanlar sohbetinde netleştirin")}
              </Text>
            )}
          </View>
        )}

        {!rakip && <View ref={kadroRef} collapsable={false} style={st.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={st.cardTitle}>{t("KADRO DURUMU")}</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>
              {ev.capacity - remaining}/{ev.capacity}
            </Text>
          </View>
          <View style={{ marginTop: 10 }}>
            <SquadDots capacity={ev.capacity} needed={ev.needed} filled={ev.filled} size={13} />
            <View style={{ height: 6, backgroundColor: C.chalk, borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
              <View style={{ height: 6, width: `${Math.min(100, Math.round((ev.filled / Math.max(1, ev.capacity)) * 100))}%`, backgroundColor: ev.filled >= ev.capacity ? C.pitch : C.kit, borderRadius: 3 }} />
            </View>
            {ev.mine && onUpdateNeeds && positionSlots(ev.cat).length > 0 && (
              <View style={{ marginTop: 10 }}>
                {!ihEdit ? (
                  <TouchableOpacity onPress={() => { setIhtiyac({ ...(ev.needs || {}) }); setIhEdit(true); }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="options-outline" size={14} color={C.turfText} />
                    <Text style={{ fontSize: 12, fontWeight: "900", color: C.turfText }}>{t("Mevki ihtiyacını düzenle")}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: C.chalk, borderRadius: 12, padding: 10 }}>
                    {positionSlots(ev.cat).map((p) => {
                      const n = (ihtiyac || {})[p.id] || 0;
                      const toplam = Object.values(ihtiyac || {}).reduce((x, y) => x + y, 0);
                      return (
                        <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: C.ink }}>{p.icon} {t(p.label)}</Text>
                          <TouchableOpacity disabled={n <= 0} onPress={() => setIhtiyac((h) => ({ ...h, [p.id]: n - 1 }))}
                            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", opacity: n <= 0 ? 0.35 : 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: "900", color: C.ink }}>−</Text>
                          </TouchableOpacity>
                          <Text style={{ width: 20, textAlign: "center", fontSize: 14, fontWeight: "900", color: C.ink }}>{n}</Text>
                          <TouchableOpacity disabled={toplam >= ev.needed} onPress={() => setIhtiyac((h) => ({ ...h, [p.id]: n + 1 }))}
                            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", opacity: toplam >= ev.needed ? 0.35 : 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: "900", color: C.ink }}>+</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    <Text style={{ fontSize: 11, color: C.faint, marginBottom: 8 }}>
                      {t("Serbest kontenjan")}: {Math.max(0, ev.needed - Object.values(ihtiyac || {}).reduce((x, y) => x + y, 0))} / {ev.needed}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity onPress={() => setIhEdit(false)} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 10, paddingVertical: 9, alignItems: "center" }}>
                        <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.faint }}>{t("Vazgeç")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { const temiz = Object.fromEntries(Object.entries(ihtiyac || {}).filter(([, v]) => v > 0)); onUpdateNeeds(ev.id, temiz); setIhEdit(false); }}
                        style={{ flex: 1, backgroundColor: C.turf, borderRadius: 10, paddingVertical: 9, alignItems: "center" }}>
                        <Text style={{ fontSize: 12.5, fontWeight: "900", color: "#fff" }}>{t("Kaydet")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
            <View style={st.legend}>
              <View style={[st.dot, { backgroundColor: C.turf }]} />
              <Text style={st.legendText}>{t("Mevcut ekip")}</Text>
            </View>
            <View style={st.legend}>
              <View style={[st.dot, { backgroundColor: C.pitch }]} />
              <Text style={st.legendText}>Uygulamadan ({ev.filled}/{ev.needed})</Text>
            </View>
            <View style={st.legend}>
              <View style={[st.dot, { borderWidth: 1.5, borderStyle: "dashed", borderColor: C.kit }]} />
              <Text style={st.legendText}>{t("Eksik")}</Text>
            </View>
          </View>
        </View>}

        {!rakip && (ev.mine || guests.length > 0) && phase !== "iptal" && (
          <View style={st.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={st.cardTitle}>UYGULAMASIZ OYUNCULAR ({guests.length})</Text>
              {ev.mine && phase !== "iptal" && (
                <TouchableOpacity onPress={() => setRosterOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginLeft: "auto" }}>
                  <Ionicons name="clipboard-outline" size={13} color={C.turfText} />
                  <Text style={{ fontSize: 11, fontWeight: "900", color: C.turfText }}>{t("Listeyi yapıştır")}</Text>
                </TouchableOpacity>
              )}
            </View>
            {guests.length === 0 && ev.mine && (
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 6, lineHeight: 17 }}>
                Uygulamaya henüz geçmemiş ekip arkadaşlarını adıyla ekle: yoklama, ödeme ve kurada yer alırlar; seride her haftaya taşınırlar.
              </Text>
            )}
            {guests.map((g) => (
              <View key={g.id} style={st.guestRow}>
                <Avatar name={g.name} size={30} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontWeight: "800", fontSize: 13, color: g.available === false ? C.faint : C.ink }}>{g.name}{g.position ? "  " + posIcon(g.position) + " " + posLabel(g.position) : ""}</Text>
                  <Text style={{ fontSize: 11, color: C.faint }}>uygulamada değil{g.available === false ? " · bu hafta yok" : ""}</Text>
                </View>
                {ev.mine && upcoming && (
                  <TouchableOpacity onPress={() => onToggleGuest(ev.id, g.id, g.available === false)} style={[st.payBtn, { backgroundColor: g.available === false ? C.chalk : C.pitchSoft }]}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: g.available === false ? C.faint : C.turfText }}>{g.available === false ? "Yok" : "Var"}</Text>
                  </TouchableOpacity>
                )}
                {ev.mine && (
                  <TouchableOpacity onPress={() => onRemoveGuest(ev.id, g.id)} style={{ marginLeft: 6, padding: 4 }}><Ionicons name="close-circle-outline" size={18} color={C.faint} /></TouchableOpacity>
                )}
              </View>
            ))}
            {ev.mine && phase !== "tamamlandi" && (
              <>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TextInput value={guestName} onChangeText={setGuestName} maxLength={40} placeholder={t("Ad Soyad")} placeholderTextColor={C.placeholder} style={[st.scoreInput, { flex: 1, width: undefined, fontSize: 14, fontWeight: "600", textAlign: "left", paddingHorizontal: 12 }]} />
                <TouchableOpacity disabled={guestName.trim().length < 2} onPress={() => { onAddGuest(ev.id, guestName.trim(), guestPos); setGuestName(""); setGuestPos(null); }} style={[st.btn, { backgroundColor: C.turf, paddingHorizontal: 14, paddingVertical: 10 }, guestName.trim().length < 2 && { opacity: 0.4 }]}>
                  <Text style={[st.btnText, { color: "#fff" }]}>{t("Ekle")}</Text>
                </TouchableOpacity>
              </View>
              {(positionSlots(ev.cat) || []).length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {[{ id: null, label: "Farketmez", icon: "•" }, ...positionSlots(ev.cat)].map((p) => (
                    <TouchableOpacity key={String(p.id)} onPress={() => setGuestPos(p.id)}
                      style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderColor: guestPos === p.id ? C.turf : C.line, backgroundColor: guestPos === p.id ? C.turf : C.chalk }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: guestPos === p.id ? "#fff" : C.turfText }}>{p.icon} {t(p.label)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              </>
            )}
          </View>
        )}

        {ev.joined && !ev.mine && (phase === "bugun" || phase === "oynandi") && ev.status !== "tamamlandi" && (
          ev.checkedIn ? (
            <View style={[st.cta, { backgroundColor: C.pitchSoft, marginTop: 10, flexDirection: "row", justifyContent: "center", gap: 8 }]}>
              <Ionicons name="checkmark-circle" size={18} color={C.turfText} /><Text style={[st.ctaText, { color: C.turfText }]}>{t("Sahadayım dedin ✓ · organizatör yoklamada görür")}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TextInput value={codeInput} onChangeText={(t) => setCodeInput(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder={t("Kod")} placeholderTextColor={C.placeholder} style={[st.scoreInput, { width: 84 }]} maxLength={4} />
              <TouchableOpacity onPress={() => (codeInput.length === 4 ? onCheckInWithCode(ev.id, codeInput) : onCheckIn(ev.id))} style={[st.cta, { backgroundColor: C.pitch, flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 }]}>
                <Ionicons name="location" size={18} color="#fff" /><Text style={st.ctaText}>{codeInput.length === 4 ? "Kodla sahadayım" : "Sahadayım"}</Text>
              </TouchableOpacity>
            </View>
          )
        )}
        {ev.mine && (phase === "bugun" || phase === "oynandi") && ev.status !== "tamamlandi" && (
          <TouchableOpacity onPress={() => onOpenCode(ev.id)} style={[st.card, { alignItems: "center", marginTop: 10, borderWidth: 1.5, borderColor: C.pitchSoft }]}>
            <Text style={st.cardTitle}>{t("YOKLAMA KODU")}</Text>
            {checkinCode ? (
              <>
                <Text style={{ fontSize: 44, fontWeight: "900", color: C.turfText, letterSpacing: 8, marginTop: 6 }}>{checkinCode}</Text>
                <Text style={{ fontSize: 12, color: C.faint, textAlign: "center" }}>Gelenler bu kodu "Sahadayım" kutusuna girer; yoklamada "sahadayım dedi" olarak görünürler. Kod 6 saat geçerli.</Text>
              </>
            ) : (
              <Text style={{ fontSize: 13, fontWeight: "800", color: C.pitch, marginTop: 6 }}>{t("Kodu göster · sahada söyle, herkes girsin")}</Text>
            )}
          </TouchableOpacity>
        )}
        {upcoming && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {ev.venue ? (
              <TouchableOpacity onPress={() => onDirections(ev)} style={[st.btn, st.btnGhost, { flex: 1, flexDirection: "row", gap: 6, paddingVertical: 10 }]}>
                <Ionicons name="navigate-outline" size={16} color={C.turfText} /><Text style={[st.btnText, { color: C.turfText }]}>{t("event.directions")}</Text>
              </TouchableOpacity>
            ) : null}
            {(ev.joined || ev.mine) && (
              <TouchableOpacity onPress={() => onCalendar(ev)} style={[st.btn, st.btnGhost, { flex: 1, flexDirection: "row", gap: 6, paddingVertical: 10 }]}>
                <Ionicons name="calendar-outline" size={16} color={C.turfText} /><Text style={[st.btnText, { color: C.turfText }]}>{t("event.calendar")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {ev.status === "iptal" && (
          <View style={[st.card, { borderWidth: 1.5, borderColor: C.line }]}>
            <Text style={st.cardTitle}>{t("İPTAL EDİLDİ")}</Text>
            <Text style={{ fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 19 }}>
              {ev.cancelReason ? `Sebep: ${ev.cancelReason}` : "Organizatör etkinliği iptal etti."} Kadrodakilere bildirildi.
            </Text>
          </View>
        )}

        {ev.ended && ev.status !== "iptal" && (
          <View style={[st.card, ev.status !== "tamamlandi" && ev.mine && { borderWidth: 1.5, borderColor: C.kit }]}>
            <Text style={st.cardTitle}>{t("YOKLAMA")}</Text>
            {ev.mine && ev.status !== "tamamlandi" && (
              <Text style={{ fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 19 }}>
                Maç oynandı, yoklama bekleniyor. Gelmeyenleri işaretleyip maçı tamamla; 48 saat içinde
                alınmazsa herkes katıldı sayılır.
              </Text>
            )}
            {ev.mine && ev.status === "tamamlandi" && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 13, color: C.ink }}>
                  <Text style={{ fontWeight: "900", color: C.pitch }}>{attended.length} katıldı</Text>
                  {"  ·  "}
                  <Text style={{ fontWeight: "900", color: noShows.length ? C.kit : C.faint }}>{noShows.length} gelmedi</Text>
                </Text>
                {noShows.length > 0 && (
                  <Text style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>
                    Gelmeyenler: {noShows.map((m) => m.name).join(", ")}
                  </Text>
                )}
              </View>
            )}
            {!ev.mine && ev.joined && (
              <View style={{ marginTop: 6 }}>
                {ev.myAttendance === "katildi" && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color={C.pitch} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: C.pitch }}>{t("Katıldın · güvenilirliğin korundu")}</Text>
                  </View>
                )}
                {ev.myAttendance === "gelmedi" && (
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="close-circle" size={18} color={C.kit} />
                      <Text style={{ fontSize: 13, fontWeight: "800", color: C.kit }}>{t("Gelmedi olarak işaretlendin")}</Text>
                    </View>
                    {ev.disputed ? (
                      <Text style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>{t("İtirazın iletildi, inceleniyor.")}</Text>
                    ) : (
                      <TouchableOpacity onPress={() => onDispute(ev.id)} style={st.disputeBtn}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: C.turfText }}>{t("Hatalı mı? İtiraz et")}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {!ev.myAttendance && (
                  <Text style={{ fontSize: 13, color: C.faint }}>{t("Organizatör henüz yoklama almadı.")}</Text>
                )}
              </View>
            )}
          </View>
        )}

        {showPay && (
          <View style={st.card}>
            <TouchableOpacity onPress={() => setOpenPay((o) => !o)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={st.cardTitle}>ÖDEMELER · {ev.price}₺/KİŞİ {openPay ? "▴" : "▾"}</Text>
              {ev.mine && (() => { const sm = paymentSummary(payList); return (
                <Text style={{ fontSize: 12, fontWeight: "800", color: sm.pending ? C.kit : C.pitch }}>{sm.paid}/{sm.total} ödendi{sm.pending ? ` · ${sm.pending}₺ bekliyor` : ""}</Text>
              ); })()}
            </TouchableOpacity>
            {!openPay ? null : ev.mine ? (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => onSendIban(ev.id)} style={[st.btn, st.btnGhost, { flex: 1, paddingVertical: 10, flexDirection: "row", gap: 6 }]}>
                    <Ionicons name="card-outline" size={16} color={C.turfText} /><Text style={[st.btnText, { color: C.turfText }]}>{t("IBAN'ı gruba gönder")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onRemindPayments(ev.id)} style={[st.btn, { flex: 1, backgroundColor: C.kitSoft, paddingVertical: 10, flexDirection: "row", gap: 6 }]}>
                    <Ionicons name="notifications-outline" size={16} color={C.kit} /><Text style={[st.btnText, { color: C.kit }]}>{t("Hatırlat")}</Text>
                  </TouchableOpacity>
                </View>
                {payList.some((p) => p.status === "bekliyor" || p.status === "odedim") && (
                  <TouchableOpacity onPress={() => onConfirmAllPayments(ev.id)} style={[st.btn, { backgroundColor: C.pitchSoft, paddingVertical: 10, marginBottom: 8 }]}>
                    <Text style={[st.btnText, { color: C.turfText }]}>{t("Herkes ödedi · hepsini işaretle")}</Text>
                  </TouchableOpacity>
                )}
                {payList.map((p) => (
                  <View key={p.id} style={st.payRow}>
                    <Avatar name={p.name} uri={p.avatar} size={30} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: p.status === "odedim" ? C.kit : C.faint }}>{p.amount}₺ · {t(PAYMENT_LABEL[p.status])}</Text>
                    </View>
                    {p.status === "odendi" || p.status === "muaf" ? (
                      <TouchableOpacity onPress={() => onConfirmPayment(ev.id, p.id, "bekliyor")} style={[st.payBtn, { backgroundColor: C.pitchSoft }]}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: C.turfText }}>{p.status === "muaf" ? "Muaf" : "✓ Ödendi"}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <TouchableOpacity onPress={() => onConfirmPayment(ev.id, p.id, "odendi")} style={[st.payBtn, { backgroundColor: p.status === "odedim" ? C.pitch : C.chalk }]}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: p.status === "odedim" ? "#fff" : C.turfText }}>{p.status === "odedim" ? "Onayla" : "Ödendi"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onConfirmPayment(ev.id, p.id, "muaf")} style={[st.payBtn, { backgroundColor: C.chalk }]}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: C.faint }}>{t("Muaf")}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: C.ink }}>
                  {t("Saha ücretin:")} <Text style={{ fontWeight: "900" }}>{ev.myPayment.amount}₺</Text> · <Text style={{ fontWeight: "800", color: ev.myPayment.status === "odendi" ? C.pitch : ev.myPayment.status === "odedim" ? C.kit : C.faint }}>{t(PAYMENT_LABEL[ev.myPayment.status])}</Text>
                </Text>
                {ev.myPayment.status === "bekliyor" && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => onCopyIban(ev.id)} style={[st.cta, st.btnGhost, { flex: 1, flexDirection: "row", justifyContent: "center", gap: 6 }]}>
                      <Ionicons name="copy-outline" size={15} color={C.turfText} /><Text style={[st.ctaText, { color: C.turfText }]}>{t("IBAN'ı kopyala")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onClaimPayment(ev.id)} style={[st.cta, { backgroundColor: C.turf, flex: 1 }]}>
                      <Text style={st.ctaText}>{t("Ödedim")}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {ev.myPayment.status === "odedim" && <Text style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>{t("Organizatör onaylayınca \"Ödendi\" olur.")}</Text>}
              </View>
            )}
          </View>
        )}

        {ev.mine && disputes.length > 0 && (
          <View style={[st.card, { borderWidth: 1.5, borderColor: C.kit }]}>
            <Text style={st.cardTitle}>YOKLAMA İTİRAZLARI ({disputes.length})</Text>
            {disputes.map((d) => (
              <View key={d.userId} style={st.payRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }}>{d.name}</Text>
                  <Text style={{ fontSize: 12, color: C.faint }}>"{d.description || "Oradaydım"}"</Text>
                </View>
                <TouchableOpacity onPress={() => onFixAttendance(ev.id, d.userId)} style={[st.payBtn, { backgroundColor: C.pitch }]}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>{t("Haklı · katıldı yap")}</Text>
                </TouchableOpacity>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>Haksızsa bir şey yapma; 7 gün içinde yöneticiye gider.</Text>
          </View>
        )}

        {ev.status === "tamamlandi" && (
          <View style={[st.card, { borderWidth: 1.5, borderColor: "#F5B301" }]}>
            <Text style={st.cardTitle}>{t("MAÇ SONUCU")}</Text>
            {ev.score ? (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 26, fontWeight: "900", color: C.ink }}>{ev.score.home} – {ev.score.away}</Text>
                <Text style={{ fontSize: 12, color: C.faint }}>{ev.score.label}</Text>
              </View>
            ) : ev.mine ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <TextInput value={sh} onChangeText={setSh} keyboardType="number-pad" placeholder={ev.kind === "rakip" ? "Biz" : "Yelekliler"} placeholderTextColor={C.placeholder} style={st.scoreInput} maxLength={2} />
                <Text style={{ fontSize: 18, fontWeight: "900", color: C.faint }}>–</Text>
                <TextInput value={sa} onChangeText={setSa} keyboardType="number-pad" placeholder={ev.kind === "rakip" ? "Rakip" : "Yeleksizler"} placeholderTextColor={C.placeholder} style={st.scoreInput} maxLength={2} />
                <TouchableOpacity disabled={sh === "" || sa === ""} onPress={() => onRecordScore(ev.id, Number(sh), Number(sa))} style={[st.btn, { backgroundColor: C.turf, paddingHorizontal: 14, paddingVertical: 10 }, (sh === "" || sa === "") && { opacity: 0.4 }]}>
                  <Text style={[st.btnText, { color: "#fff" }]}>{t("Kaydet")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: C.faint, marginTop: 6 }}>{t("Organizatör skoru henüz girmedi.")}</Text>
            )}
            <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                {ev.mvp ? (
                  <Text style={{ fontSize: 13, color: C.ink }}>
                    <Text style={{ fontWeight: "900" }}>{ev.mvp.final ? "Maçın oyuncusu: " : "Önde: "}{ev.mvp.name}</Text> · {ev.mvp.votes} oy{ev.mvp.final ? "" : " · oylama sürüyor"}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 13, color: C.faint }}>{t("MVP oylaması sürüyor — puanlama ekranından oy ver.")}</Text>
                )}
                {myMvpVote && <Text style={{ fontSize: 11, color: C.faint }}>{t("Oyunu verdin.")}</Text>}
              </View>
            </View>
            {stats.some((x) => x.goals > 0 || x.assists > 0) && (
              <Text style={{ fontSize: 13, color: C.ink, marginTop: 10 }}>
                ⚽ {stats.filter((x) => x.goals > 0).sort((a, b) => b.goals - a.goals).map((x) => `${x.name.split(" ")[0]} ${x.goals}`).join(", ") || "—"}
                {stats.some((x) => x.assists > 0) ? `  ·  🎯 ${stats.filter((x) => x.assists > 0).sort((a, b) => b.assists - a.assists).map((x) => `${x.name.split(" ")[0]} ${x.assists}`).join(", ")}` : ""}
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              {ev.mine && (
                <TouchableOpacity onPress={() => setOpenStats((o) => !o)} style={[st.btn, st.btnGhost, { flex: 1, paddingVertical: 9 }]}>
                  <Text style={[st.btnText, { color: C.turfText }]}>{openStats ? "Gol/asist girişini kapat" : "Gol / asist gir"}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => onShareSummary(ev)} style={[st.btn, { flex: 1, backgroundColor: "#25D366", paddingVertical: 9, flexDirection: "row", gap: 6 }]}>
                <Ionicons name="logo-whatsapp" size={16} color="#fff" /><Text style={[st.btnText, { color: "#fff" }]}>{t("Özeti gruba at")}</Text>
              </TouchableOpacity>
            </View>
            {ev.mine && openStats && (
              <View style={{ marginTop: 8 }}>
                {statRoster.map((m) => {
                  const sv = statOf(m.id);
                  return (
                    <View key={m.id} style={st.payRow}>
                      <Text style={{ flex: 1, fontWeight: "800", fontSize: 13, color: C.ink }} numberOfLines={1}>{m.name}{m.guest ? " ·" : ""}{m.guest ? <Text style={{ color: C.faint, fontWeight: "600" }}> {t("misafir")}</Text> : null}</Text>
                      {[["⚽", "goals"], ["🎯", "assists"]].map(([ic, k]) => (
                        <View key={k} style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
                          <Text style={{ fontSize: 12 }}>{ic}</Text>
                          <TouchableOpacity onPress={() => onSetStat(ev.id, m, { ...sv, [k]: Math.max(0, sv[k] - 1) })} style={st.stepBtn}><Ionicons name="remove" size={14} color={C.turfText} /></TouchableOpacity>
                          <Text style={{ width: 18, textAlign: "center", fontWeight: "900", color: C.ink }}>{sv[k]}</Text>
                          <TouchableOpacity onPress={() => onSetStat(ev.id, m, { ...sv, [k]: Math.min(30, sv[k] + 1) })} style={st.stepBtn}><Ionicons name="add" size={14} color={C.turfText} /></TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {showAv && (
          <View style={[st.card, { borderLeftWidth: 4, borderLeftColor: C.pitch }]}>
            <Text style={st.cardTitle}>{t("BU HAFTA VAR MISIN?")}</Text>
            {!av.asked ? (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 13, color: C.faint, lineHeight: 18 }}>
                  {ev.mine ? `Bu haftanın ilanı geçen haftadan kopyalandı (${ev.needed} eksik). Sabit kadroya maça 72 saat kala otomatik sorulur; cevaplara göre eksik sayısı önerilir — istersen şimdi sor.` : "Sabit kadroya henüz sorulmadı; maça 72 saat kala sistem kendisi sorar, cevap vermeyenlere 24 saat kala hatırlatır."}
                </Text>
                {ev.mine && (
                  <TouchableOpacity onPress={() => onAskAvailability(ev.id)} style={[st.btn, st.btnGhost, { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 14 }]}>
                    <Text style={[st.btnText, { color: C.turfText }]}>{t("Şimdi sor")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[["✅", av.varim, "varım", C.pitch], ["❌", av.yokum, "yokum", C.kit], ["🤔", av.belirsiz, "belli değil", C.faint], ["⏳", av.cevapsiz, "cevapsız", C.faint]].map(([ic, n, l, col]) => (
                    <View key={l} style={st.avChip}><Text style={{ fontSize: 12, fontWeight: "900", color: col }}>{ic} {n} {l}</Text></View>
                  ))}
                </View>
                {!ev.mine && (
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                    {VARMISIN_OPTIONS.map((o) => (
                      <TouchableOpacity key={o.id} onPress={() => onAnswer(ev.id, o.id)}
                        style={[st.avAnswer, av.myAnswer === o.id && { backgroundColor: C.turf, borderColor: C.turf }]}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: av.myAnswer === o.id ? "#fff" : C.ink }}>{t(o.text)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {ev.mine && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 13, color: C.ink }}>
                      Kadro hesabı: {ev.capacity} kişilik, {ev.offlineRegulars || 0} uygulama dışı sabit oyuncu, {av.varim} "varım"
                      {" "}→ önerilen eksik <Text style={{ fontWeight: "900", color: av.suggested !== ev.needed ? C.kit : C.pitch }}>{av.suggested}</Text> (şu an {ev.needed})
                    </Text>
                    {av.suggested !== ev.needed && (
                      <TouchableOpacity onPress={() => onApplySuggested(ev.id)} style={[st.cta, { backgroundColor: C.kit, marginTop: 10 }]}>
                        <Text style={st.ctaText}>Eksiği {av.suggested} yap · kadroya duyur</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {showPositions && positionSlots(ev).some((sl) => sl.id !== "farketmez") && (
          <View style={st.card}>
            <Text style={st.cardTitle}>{t("ARANAN MEVKİLER")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {positionSlots(ev).map((sl) => {
                const done = sl.filled >= sl.quota;
                return (
                  <View key={sl.id} style={[st.posChip, done && { backgroundColor: C.pitchSoft, borderColor: C.pitchSoft }]}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: done ? C.pitch : C.ink }}>
                      {sl.icon} {sl.label} {sl.filled}/{sl.quota}{done ? " ✓" : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={st.card}>
          <TouchableOpacity onPress={() => setOpenDesc((o) => !o)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[st.cardTitle, { flex: 1 }]}>{t("AÇIKLAMA")}</Text>
              {ev.mine && onUpdateDesc && (
                <TouchableOpacity onPress={() => Alert.prompt && Alert.prompt(t("Açıklamayı düzenle"), "", [
                  { text: t("Vazgeç"), style: "cancel" },
                  { text: t("Kaydet"), onPress: (v) => onUpdateDesc(ev.id, v || "") },
                ], "plain-text", ev.desc || "")} style={{ padding: 4 }}>
                  <Ionicons name="create-outline" size={16} color={C.turfText} />
                </TouchableOpacity>
              )}
            </View>
            <Ionicons name={openDesc ? "chevron-up" : "chevron-down"} size={16} color={C.faint} />
          </TouchableOpacity>
          <Text style={{ fontSize: 14, color: C.ink, lineHeight: 21, marginTop: 6 }} numberOfLines={openDesc ? undefined : 2}>{ev.desc}</Text>
          {ev.recurrence === "haftalik" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: C.pitchSoft, borderRadius: 10, padding: 10 }}>
              <Ionicons name="repeat" size={16} color={C.turfText} />
              <Text style={{ flex: 1, fontSize: 12, color: C.turfText, fontWeight: "700", lineHeight: 17 }}>
                Her {GUNLER_UZUN[ev.weekday]} {ev.time || ""} tekrar eder. Maç bitince gelecek hafta otomatik açılır; ekip grubu aynı kalır.
              </Text>
            </View>
          )}
        </View>

        {!ev.mine && (
          <TouchableOpacity onPress={() => onOrganizer(ev.org)} style={[st.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <Avatar name={ev.org.name} uri={ev.org.avatar} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink, fontSize: 14 }}>{ev.org.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Stars value={ev.org.rating} size={12} />
                <Text style={{ fontWeight: "800", fontSize: 12, color: C.ink }}>{ev.org.rating}</Text>
                <Text style={{ fontSize: 12, color: C.faint }}>({ev.org.count} puan)</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                <Ionicons name="shield-checkmark" size={12} color={C.pitch} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.pitch }}>
                  {relInfo(ev.org).text} güvenilirlik
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.gray} />
          </TouchableOpacity>
        )}

        {ev.mine && ev.waitlist && ev.waitlist.length > 0 && (
          <View style={st.card}>
            <Text style={st.cardTitle}>YEDEKLER ({ev.waitlist.length})</Text>
            {ev.waitlist.map((w, i) => (
              <View key={w.id || i} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: C.faint, width: 18 }}>{i + 1}.</Text>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: C.ink }}>{w.name}</Text>
                <Text style={{ fontSize: 12, color: C.faint }}>{w.position ? `${posIcon(w.position)} ${posLabel(w.position)}` : "Farketmez"}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{t("Yer açılınca sıradaki yedeğe 2 saatlik onay teklifi gider.")}</Text>
          </View>
        )}

        {ev.mine && (
          <View style={st.card}>
            <TouchableOpacity onPress={() => setOpenApps((o) => !o)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={st.cardTitle}>{rakip ? "RAKİP TEKLİFLERİ" : "BAŞVURULAR"} ({eventApps.length})</Text>
              <Ionicons name={openApps ? "chevron-up" : "chevron-down"} size={16} color={C.faint} />
            </TouchableOpacity>
            {openApps && eventApps.length === 0 && (
              <Text style={{ color: C.faint, fontSize: 13, marginTop: 6 }}>
                {rakip ? "Henüz teklif yok — ilan yayında, rakip takımlar burada listelenecek." : "Henüz başvuru yok — talep yayında, gelenler burada listelenecek."}
              </Text>
            )}
            {openApps && eventApps.map((a) => (
              <View key={a.id} style={st.appRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar name={a.who.name} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }}>{rakip ? `${teamLabel(a.who)} · ${a.who.name.split(" ")[0]}` : a.who.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      <Stars value={a.who.rating} size={11} />
                      <Text style={{ fontSize: 11, color: C.faint }}>{a.who.rating}</Text>
                      {a.who.rel < 85 ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <Ionicons name="warning" size={11} color={C.kit} />
                          <Text style={{ fontSize: 11, fontWeight: "800", color: C.kit }}>
                            {relInfo(a.who).text} güvenilirlik
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <Ionicons name="shield-checkmark" size={11} color={C.pitch} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: C.pitch }}>{relInfo(a.who).text}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {a.position && (
                  <View style={{ flexDirection: "row", marginTop: 6 }}>
                    <View style={st.posChip}><Text style={{ fontSize: 12, fontWeight: "800", color: C.ink }}>{posIcon(a.position)} {posLabel(a.position)}</Text></View>
                  </View>
                )}
                <Text style={st.note}>"{a.note}"</Text>
                {a.status === "beklemede" && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <TouchableOpacity onPress={() => onApprove(a.id)} style={[st.btn, { backgroundColor: C.pitch }]}>
                      <Text style={st.btnText}>{t("Onayla")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onReject(a.id)} style={[st.btn, st.btnGhost]}>
                      <Text style={[st.btnText, { color: C.faint }]}>{t("Reddet")}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {a.status === "orgBekliyor" && (
                  <Text style={{ fontSize: 12, fontWeight: "800", color: C.kit, marginTop: 8 }}>
                    {a.invited ? `Davet ettin · ${a.who.name.split(" ")[0]}'ın cevabı bekleniyor…` : `Onayladın · ${a.who.name.split(" ")[0]}'ın son onayı bekleniyor…`}
                  </Text>
                )}
                {a.status === "onaylandi" && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                    <Ionicons name="checkmark" size={14} color={C.pitch} />
                    <Text style={{ fontSize: 12, fontWeight: "900", color: C.pitch }}>
                      {t("Kadroda — grup sohbetine eklendi")}
                    </Text>
                  </View>
                )}
                {a.status === "reddedildi" && (
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.faint, marginTop: 8 }}>{t("Reddedildi")}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {rosterOpen && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setRosterOpen(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} activeOpacity={1} onPress={() => setRosterOpen(false)}>
            <TouchableOpacity activeOpacity={1} style={{ backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 28, maxHeight: "85%" }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: C.ink }}>{t("WhatsApp listesini yapıştır")}</Text>
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 3 }}>{t("Kadro mesajını olduğu gibi yapıştırın; adları biz ayıklarız.")}</Text>
              <TextInput value={rosterText} onChangeText={setRosterText} multiline placeholder={"1. Ali Yılmaz\n2. Veli (kaleci)\n3. Hasan"}
                placeholderTextColor={C.placeholder}
                style={{ backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12, minHeight: 110, maxHeight: 170, fontSize: 14, color: C.ink, marginTop: 10, textAlignVertical: "top" }} />
              {rosterParsed.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {rosterParsed.map((p, i2) => (
                    <View key={i2} style={{ backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: C.turfText }}>{p.gk ? "🧤 " : ""}{p.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity disabled={!rosterParsed.length} onPress={rosterConfirm}
                style={{ backgroundColor: C.kit, opacity: rosterParsed.length ? 1 : 0.4, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 12 }}>
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
                  {rosterParsed.length ? rosterParsed.length + " " + t("kişiyi misafir olarak ekle") : t("Liste bekleniyor…")}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {manageable && (
        <View style={st.bottomBar}>
          {shareable && (
            <TouchableOpacity onPress={() => Alert.alert(t("Nasıl paylaşalım?"), t("Gruba giden davetin biçimini seç"), [
              { text: "🖼 " + t("Görsel kart"), onPress: async () => {
                try {
                  const vs = require("react-native-view-shot");
                  const uri = await vs.captureRef(kadroRef, { format: "png", quality: 0.95 });
                  await Share.share(Platform.OS === "ios" ? { url: uri } : { message: uri });
                } catch {
                  Alert.alert("🖼 " + t("Görsel kart"), t("Görsel paylaşım mağaza sürümünde geliyor 📦 — şimdilik davet metnini gönderiyorum."),
                    [{ text: t("Tamam"), onPress: () => onShare(ev) }]);
                }
              } },
              { text: "📝 " + t("Metin"), onPress: () => onShare(ev) },
              { text: t("Vazgeç"), style: "cancel" },
            ])} style={[st.cta, st.waBtn, { marginBottom: 8 }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={st.ctaText}>WhatsApp grubuna at · {ev.needed - ev.filled} eksik</Text>
            </TouchableOpacity>
          )}
          {onRepeat && (
            <TouchableOpacity onPress={() => onRepeat(ev)} style={[st.btn, { backgroundColor: C.pitchSoft, paddingVertical: 12, flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 8 }]}>
              <Ionicons name="repeat" size={16} color={C.turfText} />
              <Text style={[st.btnText, { color: C.turfText }]}>{t("Bu maçı tekrarla")}</Text>
            </TouchableOpacity>
          )}
          {ev.mine && ev.recurrence === "haftalik" && onStopSeries && (
            <TouchableOpacity onPress={() => Alert.alert("⏹ " + t("Seriyi durdur"), t("Bu hafta oynanır, sonraki haftalar açılmaz. Grup sohbeti durur ama silinmez."), [
              { text: t("Vazgeç"), style: "cancel" },
              { text: t("Durdur"), style: "destructive", onPress: () => onStopSeries(ev.id) },
            ])} style={[st.btn, { backgroundColor: "#FEE2E2", paddingVertical: 12, flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 8 }]}>
              <Ionicons name="stop-circle-outline" size={16} color="#DC2626" />
              <Text style={[st.btnText, { color: "#DC2626" }]}>{t("Seriyi durdur")}</Text>
            </TouchableOpacity>
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={() => onEdit(ev.id)} style={[st.btn, st.btnGhost, { paddingVertical: 12, flexDirection: "row", gap: 6 }]}>
              <Ionicons name="create-outline" size={16} color={C.turfText} />
              <Text style={[st.btnText, { color: C.turfText }]}>{t("Düzenle")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onCancel(ev.id)} style={[st.btn, st.btnGhost, { paddingVertical: 12, flexDirection: "row", gap: 6 }]}>
              <Ionicons name="close-circle-outline" size={16} color={C.danger} />
              <Text style={[st.btnText, { color: C.danger }]}>{t("İptal et")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {canRate && (
        <View style={st.bottomBar}>
          {rated ? (
            <View style={[st.cta, { backgroundColor: C.pitchSoft }]}>
              <Text style={[st.ctaText, { color: C.turfText }]}>{t("Puanladın ✓ Teşekkürler")}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => onRate(ev.id)} style={[st.cta, { backgroundColor: C.turf, flexDirection: "row", justifyContent: "center", gap: 8 }]}>
              <Ionicons name="star" size={16} color={C.star} />
              <Text style={st.ctaText}>{t("Takım arkadaşlarını puanla")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {ev.mine && ev.ended && ev.status !== "tamamlandi" && (
        <View style={st.bottomBar}>
          <TouchableOpacity onPress={() => onAttendance(ev.id)} style={[st.cta, { backgroundColor: C.kit }]}>
            <Text style={st.ctaText}>{t("Yoklama al ve maçı tamamla")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!ev.mine && !canRate && ev.status !== "iptal" && (
        <View style={st.bottomBar}>
          {ev.joined ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => onGoChat("g-" + ev.id)} style={[st.cta, { backgroundColor: C.turf, flex: 1 }]}>
                <Text style={st.ctaText}>{t("Grup sohbetine git")}</Text>
              </TouchableOpacity>
              {!ev.ended && (
                <TouchableOpacity onPress={() => onLeave(ev.id)} style={[st.cta, st.btnGhost, { paddingHorizontal: 14 }]}>
                  <Text style={[st.ctaText, { color: C.danger }]}>{t("Ayrıl")}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : pendingInvite ? (
            <View>
              <Text style={{ textAlign: "center", fontSize: 13, fontWeight: "800", color: pendingOffer ? C.kit : C.turfText, marginBottom: 8 }}>
                {pendingOffer
                  ? `Yer açıldı! ${myApp.offerExpiresAt ? myApp.offerExpiresAt + "'ye kadar" : "Süresi içinde"} onayla${myApp.position ? ` · ${posLabel(myApp.position)}` : ""}`
                  : `${ev.org ? ev.org.name.split(" ")[0] : "Organizatör"} seni kadroya davet etti${myApp.position ? ` · ${posLabel(myApp.position)}` : ""}`}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity onPress={() => onAcceptInvite(myApp.id)} style={[st.cta, { backgroundColor: C.pitch, flex: 1 }]}>
                  <Text style={st.ctaText}>{pendingOffer ? "Yerimi onayla" : "Daveti kabul et"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDeclineInvite(myApp.id)} style={[st.cta, st.btnGhost, { paddingHorizontal: 16 }]}>
                  <Text style={[st.ctaText, { color: C.danger }]}>{t("Reddet")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : myApp ? (
            <TouchableOpacity onPress={() => onGoChat("dm-" + ev.id)} style={[st.cta, { backgroundColor: C.pitchSoft }]}>
              <Text style={[st.ctaText, { color: C.turfText }]}>{t("Başvurun iletildi · Sohbete git")}</Text>
            </TouchableOpacity>
          ) : ev.myWaitlist ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={[st.cta, { backgroundColor: C.kitSoft, flex: 1 }]}>
                <Text style={[st.ctaText, { color: C.kit }]}>Yedek listesindesin ⏳ {ev.waitlistCount ? `· ${ev.waitlistCount} yedek` : ""}</Text>
              </View>
              <TouchableOpacity onPress={() => onLeaveWaitlist(ev.id)} style={[st.cta, st.btnGhost, { paddingHorizontal: 14 }]}>
                <Text style={[st.ctaText, { color: C.faint }]}>{t("Ayrıl")}</Text>
              </TouchableOpacity>
            </View>
          ) : canWaitlist ? (
            <TouchableOpacity onPress={() => onJoinWaitlist(ev.id)} style={[st.cta, { backgroundColor: C.kit }]}>
              <Text style={st.ctaText}>Yedek ol{ev.waitlistCount ? ` · ${ev.waitlistCount} yedek bekliyor` : ""}</Text>
            </TouchableOpacity>
          ) : ev.status === "doldu" ? (
            <View style={[st.cta, { backgroundColor: C.turf, opacity: 0.5 }]}>
              <Text style={st.ctaText}>{t("Kadro tamamlandı")}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={onApply} style={[st.cta, { backgroundColor: C.pitch }]}>
              <Text style={st.ctaText}>
                {rakip ? "Rakip ol · teklif gönder" : `Başvur${ev.price > 0 ? ` · ${ev.price}₺/kişi` : ""}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.pitchDark, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { flexDirection: "row", alignItems: "center" },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  waBtn: { backgroundColor: "#25D366", flexDirection: "row", justifyContent: "center", gap: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4 },
  infoBox: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 12,
    alignItems: "center", justifyContent: "center",
  },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 16, marginTop: 12, borderWidth: 1, borderColor: C.line },
  cardTitle: { fontSize: 10.5, fontWeight: "900", letterSpacing: 1.2, color: C.faint },
  legend: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 11, fontWeight: "600", color: C.faint },
  dot: { width: 10, height: 10, borderRadius: 5 },
  appRow: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginTop: 10 },
  note: {
    backgroundColor: C.chalk, borderRadius: 10, padding: 10, marginTop: 8,
    fontSize: 13, fontStyle: "italic", color: C.ink,
  },
  btn: { flex: 1, borderRadius: 12, alignItems: "center", paddingVertical: 9 },
  btnGhost: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  posChip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  stepBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.pitchSoft, alignItems: "center", justifyContent: "center", marginHorizontal: 2 },
  guestRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  payRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  payBtn: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  scoreInput: { width: 64, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 8, textAlign: "center", fontSize: 18, fontWeight: "900", color: C.ink, backgroundColor: C.surface },
  avChip: { backgroundColor: C.chalk, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  avAnswer: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: 10, paddingVertical: 9 },
  disputeBtn: {
    alignSelf: "flex-start", backgroundColor: C.chalk, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7, marginTop: 8,
  },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, padding: 14,
  },
  cta: { borderRadius: 16, alignItems: "center", paddingVertical: 15 },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
