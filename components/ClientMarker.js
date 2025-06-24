import React from "react";
import { Marker } from "react-native-maps";
import { Image } from "react-native";

const ClientMarker = ({ client }) => {
    return (
        <Marker
            coordinate={{
                latitude: client.client_location.latitud,
                longitude: client.client_location.longitud,
            }}
            title={`${client.name} ${client.lastName}`}
        >
           <Image
                source={require("../icons/tienda.png")} 
                style={{ width: 40, height: 40 }}
            />  
        </Marker>
    );
};

export default ClientMarker;
