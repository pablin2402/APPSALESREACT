import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { AuthContext } from "../AuthContext";
import MapSalesMan from "../components/MapSalesMan";
import MapScreenDelivery from "../components/MapScreenDelivery";


export default function MapScreen() {
  const { role } = useContext(AuthContext);
  return (
    <View style={[styles.container]}>
          {role === "SALES" && <MapSalesMan />}
          {role === "ADMIN" && <MapSalesMan />}
          {role === "DELIVERY" && <MapScreenDelivery />}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  }
});