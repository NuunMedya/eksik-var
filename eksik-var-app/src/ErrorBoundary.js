// Beklenmeyen bir hata olursa kırmızı ekran yerine kibar bir ekran + yeniden başlatma
import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { t } from "./i18n";
import { C } from "./theme";

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, key: 0 }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.warn("Yakalanan hata:", error, info && info.componentStack); }
  reset = () => this.setState((s) => ({ error: null, key: s.key + 1 }));
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: C.turf, alignItems: "center", justifyContent: "center", padding: 28 }}>
          <Image source={require("../assets/logo-mark.png")} style={{ width: 110, height: 110, marginBottom: 16 }} resizeMode="contain" />
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "center" }}>{t("Bir şeyler ters gitti")}</Text>
          <Text style={{ color: C.mist, fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
            Beklenmeyen bir hata oldu. Yeniden başlatınca kaldığın yerden devam edebilirsin; sorun sürerse destek@eksikvar.app.
          </Text>
          <TouchableOpacity onPress={this.reset} style={{ marginTop: 22, backgroundColor: C.pitch, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>{t("Yeniden başlat")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
  }
}
