import React, { useEffect, useContext } from 'react';
import * as Location from 'expo-location';
import { AuthContext } from '../AuthContext';
import { LogBox } from 'react-native';
import axios from "axios";
import { API_URL } from "../config";

LogBox.ignoreLogs(['new NativeEventEmitter']);

export default function LocationTracker() {
    const { user } = useContext(AuthContext);
    const { token, idOwner, idUser, role } = useContext(AuthContext);

    useEffect(() => {
        let interval;

        const iniciarUbicacion = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Permisos de ubicación denegados');
                return;
            }

            interval = setInterval(async () => {
                try {
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                    });

                    const coords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };

                    enviarUbicacionAlBackend(coords);
                } catch (error) {
                    console.error("Error obteniendo ubicación:", error);
                }
            }, 60000); // cada minuto
        };

        const enviarUbicacionAlBackend = async (coords) => {
            try {
                if (role === "SALES") {
                    const payload = {
                        delivery: null,
                        latitud: coords.latitude,
                        longitud: coords.longitude,
                        Timestamp: Date.now(),
                        salesManId: idUser,
                        id_owner: idOwner,
                        longitudDestiny: null,
                        latitudDestiny: null,
                        deliveryInWay:false
                    };

                    await axios.post(API_URL + "/whatsapp/location/list", payload);
                } else if (role === "ADMIN") {
                    const payload = {
                        delivery: null,
                        latitud: coords.latitude,
                        longitud: coords.longitude,
                        Timestamp: Date.now(),
                        salesManId: idUser,
                        id_owner: idOwner,
                        longitudDestiny: null,
                        latitudDestiny: null,
                        deliveryInWay:false
                    };

                    await axios.post(API_URL + "/whatsapp/location/list", payload);
                } else if (role === "DELIVERY") {
                    const payload = {
                        delivery: idUser,
                        latitud: coords.latitude,
                        longitud: coords.longitude,
                        Timestamp: Date.now(),
                        salesManId: null,
                        id_owner: idOwner,
                        longitudDestiny: null,
                        latitudDestiny: null,
                        deliveryInWay:false
                    };

                    await axios.post(API_URL + "/whatsapp/location/list", payload);
                }

            } catch (error) {
                console.error('Error al enviar ubicación:', error);
            }
        };

        iniciarUbicacion();

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user]);

    return null;
}
