import React, { memo } from "react";
import { View, Image, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { getCategoryConfig } from "../utils/MunicipiosCochabamba";

function ClientMarker({ client, onPress }) {
  if (!client?.client_location?.latitud || !client?.client_location?.longitud) {
    return null;
  }
  console.log(client.userCategory)
  const cfg = getCategoryConfig(client.userCategory);
  console.log(cfg)

  return (
    function ClientMarker({ client, onPress }) {

  if (!client?.client_location?.latitud ||
      !client?.client_location?.longitud) {
    return null;
  }

  const cfg = getCategoryConfig(client.userCategory);

  return (
  <Marker
    coordinate={{
      latitude:Number(client.client_location.latitud),
      longitude:Number(client.client_location.longitud),
    }}
  >
    <View
      style={{
        width:40,
        height:40,
        backgroundColor:"red",
        borderRadius:20
      }}
    />
  </Marker>
);
}
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#111827",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 5,
  },
  img: {
    width: 20,
    height: 20,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#111827",
    marginTop: -2,
  },
});

export default memo(ClientMarker);