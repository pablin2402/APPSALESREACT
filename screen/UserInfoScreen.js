import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { AuthContext } from "../AuthContext";
import SalesManInfoScreen from "../components/SalesManInfoPage";
import DeliveryInfoPage from "../components/DeliveryInfoPage";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function UserInfoScreen() {
  const { role } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
 
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        {role === "ADMIN" && <SalesManInfoScreen />}
        {role === "SALES" && <SalesManInfoScreen />}
        {role === "DELIVERY" && <DeliveryInfoPage />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
 
  
});