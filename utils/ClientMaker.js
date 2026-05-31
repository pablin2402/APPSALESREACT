import React, { memo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { getCategoryConfig } from "../utils/MunicipiosCochabamba";

function ClientMarker({ client, onPress }) {
  if (
    !client?.client_location?.latitud ||
    !client?.client_location?.longitud
  ) {
    return null;
  }

  const cfg = getCategoryConfig(client.userCategory);
  const iconUrl = client?.client_location?.iconType;

  return (
    <Marker
      coordinate={{
        latitude: Number(client.client_location.latitud),
        longitude: Number(client.client_location.longitud),
      }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.wrapper}>
        <View style={[styles.bubble, { backgroundColor: cfg.color }]}>
          {iconUrl ? (
            <Image source={{ uri: iconUrl }} style={styles.img} resizeMode="contain" />
          ) : (
            <Ionicons name={cfg.icon} size={18} color="#fff" />
          )}
        </View>
        <View style={[styles.pointer, { borderTopColor: cfg.color }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  bubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 5,
  },
  img: {
    width: 24,
    height: 24,
    tintColor: "#fff",
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -3,
  },
});

export default memo(ClientMarker);