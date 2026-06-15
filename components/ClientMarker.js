import React from "react";
import { Marker } from "react-native-maps";
import { Image } from "react-native";

const barImg = require("../icons/bar.png");
const tenedorImg = require("../icons/tenedor.png");
const supermercadoImg = require("../icons/supermercado.png");
const tiendaImg = require("../icons/tienda.png");

const getCategoryImage = (category) => {
  const normalized = category.toLowerCase().trim();
  if (["bar"].includes(normalized)) return barImg;
  if (["restaurante"].includes(normalized)) return tenedorImg;
  if (["mayorista"].includes(normalized)) return supermercadoImg;
   if (["tienda", ].includes(normalized)) return tiendaImg;
  return tiendaImg;
};
const ClientMarker = ({ client }) => {
      const img = getCategoryImage(client.userCategory);

    return (
        <Marker
            coordinate={{
                latitude: client.client_location.latitud,
                longitude: client.client_location.longitud,
            }}
            title={`${client.name} ${client.lastName}`}
        >
           <Image
                source={img}
                style={{ width: 40, height: 40 }}
            />  
        </Marker>
    );
};

export default ClientMarker;
