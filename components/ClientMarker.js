import React, { useState } from "react";
import { Marker } from "react-native-maps";
import { View, Image } from "react-native";

const barImg = require("../icons/bar.png");
const tenedorImg = require("../icons/tenedor.png");
const supermercadoImg = require("../icons/supermercado.png");
const tiendaImg = require("../icons/tienda.png");

const SIZE = 36;

const getCategoryImage = (category) => {
  const normalized = String(category || "").toLowerCase().trim();
  if (normalized === "bar") return barImg;
  if (normalized === "restaurante") return tenedorImg;
  if (normalized === "mayorista") return supermercadoImg;
  return tiendaImg;
};

const ClientMarker = ({ client }) => {
  const [ready, setReady] = useState(false);
  const img = getCategoryImage(client.userCategory);

  const lat = parseFloat(client.client_location?.latitud);
  const lng = parseFloat(client.client_location?.longitud);
  if (!lat || !lng) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      title={`${client.name} ${client.lastName}`}
      tracksViewChanges={!ready}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={{
          width: SIZE,
          height: SIZE,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Image
          source={img}
          style={{ width: SIZE, height: SIZE }}
          resizeMode="contain"
          fadeDuration={0}
          onLoad={() => setReady(true)}
        />
      </View>
    </Marker>
  );
};

export default React.memo(ClientMarker);