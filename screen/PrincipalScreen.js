import React, { useContext } from "react";
import { ScrollView,View, StyleSheet } from "react-native";
import { AuthContext } from "../AuthContext";
import SalesPrincipalPage from "../components/SalesPrincipalPage";
import DeliveryPage from "../components/DeliveryPage";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PrincipalScreen() {
  const { role } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {role === "SALES" && <SalesPrincipalPage />}
          {role === "ADMIN" && <SalesPrincipalPage />}
          {role === "DELIVERY" && <DeliveryPage />}
        </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7E6E6",
  }
});