import React, { useContext } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { AuthContext } from "../AuthContext";
import SalesManInfoScreen from "../components/SalesManInfoPage";
import DeliveryInfoPage from "../components/DeliveryInfoPage";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
const COLORS = {
  brand: "#D3423E",
  brandDark: "#bb3330",
  bg: "#f9fafb",
  card: "#ffffff",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  text: "#111827",
  textMid: "#6b7280",
  textLight: "#9ca3af",
  success: "#16a34a",
  successBg: "#dcfce7",
  dangerBg: "#fee2e2",
};
export default function UserInfoScreen() {
  const { role } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  return (
    <>
      {role === "ADMIN" && <SalesManInfoScreen />}
      {role === "SALES" && <SalesManInfoScreen />}
      {role === "DELIVERY" && <DeliveryInfoPage />}
  </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

});