import React, { useEffect, useState, useRef, useContext } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator } from "react-native";
import MapView from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import axios from "axios";
import { API_URL } from "../config";
import { GOOGLE_API_KEY } from "../config";

import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { Marker } from "react-native-maps";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ClientMarker from "../components/ClientMarker";
import styles from "../styles/MapScreenStyles";

import { TimerContext } from "../components/TimerContext";

import { AuthContext } from "../AuthContext";

const MapDelivery = () => {
    const { startTimer, stopTimer } = useContext(TimerContext);

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });
    const mapRef = useRef(null);
    const [distance, setDistance] = useState("");
    const [duration, setDuration] = useState("");
    const [orderId, setOrderId] = useState("")
    const [filteredClients, setFilteredClients] = useState([]);
    const [showRegisterButton, setShowRegisterButton] = useState(false);

    const [selectedClient, setSelectedClient] = useState(null);
    const [modality, setModal] = useState(false);

    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);


    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const [showRoute, setShowRoute] = useState(false);
    const [showClients, setShowClients] = useState(true);

    const [showRoutes, setShowRoutes] = useState(false);
    const [route, setRoute] = useState(null);
    const [listRoute, setListRoute] = useState(null);

    const localTime = new Date();
    const [routeId, setRouteId] = useState("");
    const { token, idOwner, idUser } = useContext(AuthContext);

    function getStartOfDayInUTCMinus4(date) {
        const utcDate = new Date(date);
        utcDate.setHours(utcDate.getHours() - 4);
        return utcDate.toISOString();
    };
    const today = new Date();

    const startRouteToday = async () => {
        const dateInGMTMinus4 = getStartOfDayInUTCMinus4(today);
        try {

            const response = await axios.post(API_URL + "/whatsapp/delivery/list/route", {
                delivery: idUser,
                id_owner: idOwner,
                startDate: dateInGMTMinus4,
                status: "",
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setListRoute(response.data.data);
        } catch (error) {
        }
    };
    const getRoutesById = async (value) => {
        try {
            const response = await axios.post(API_URL + "/whatsapp/delivery/list/route/id", {
                _id: value,
                id_owner: idOwner,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setRoute(response.data);
        } catch (error) {
        }
    };
    const uploadRoute = async (value, visitStartTime, visitEndTime, visitTime, tripTime1, distanceTrip1, messsageTrack) => {
        try {
            const res = await axios.put(API_URL + "/whatsapp/route/delivery/id", {
                status: "En progreso",
                id_owner: idOwner,
                _id: routeId,
                routeId: value._id,
                visitStatus: true,
                visitTime: visitTime,
                orderTaken: false,
                visitStartTime: visitStartTime,
                visitEndTime: visitEndTime,
                tripTime: tripTime1,
                distanceTrip: distanceTrip1,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.status === 200) {
                await axios.post(API_URL + "/whatsapp/order/track", {
                    orderId: orderId,
                    eventType: messsageTrack,
                    triggeredBySalesman: "",
                    triggeredByDelivery: idUser,
                    triggeredByUser: "",
                    location: { lat: 0, lng: 0 }
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
        }
    };
    const uploadProgressRoute = async () => {
        try {
            await axios.put(API_URL + "/whatsapp/route/delivery/progress/id", {
                id_owner: idOwner,
                _id: routeId,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (error) {
        }
    };
    async function getUserLocation() {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            alert("Permisos denegados");
            return;
        }
        let location = await Location.getCurrentPositionAsync({});
        const current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
        setOrigin(prevOrigin => {
            if (prevOrigin.latitude !== current.latitude || prevOrigin.longitude !== current.longitude) {
                return current;
            }
            return prevOrigin;
        });
        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
    }
    const handleTimerToggle = async (selectedClient2, text) => {

        const userLocation = await getUserLocation();
        const latitudDelivery = userLocation.latitude;
        const longitudDelivery = userLocation.longitude;
        const latitudDest = selectedClient2.client_location.latitud;
        const longitudDest = selectedClient2.client_location.longitud;

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${latitudDelivery},${longitudDelivery}&destinations=${latitudDest},${longitudDest}&key=${GOOGLE_API_KEY}`;
        try {
            const response = await axios.get(url);
            const data = response.data;

            if (
                data.rows.length > 0 &&
                data.rows[0].elements.length > 0 &&
                data.rows[0].elements[0].status === "OK"
            ) {
                const distance = data.rows[0].elements[0].distance.text;
                const duration = data.rows[0].elements[0].duration.text;
                setDistance(distance);
                setDuration(duration);
                if (isTimerRunning) {
                    setTimer(0);
                    const stopTime = await stopTimer();
                    setShowRoute(true);
                    setShowClients(false);
                    await uploadRoute(selectedClient2, null, stopTime, formatTime(timer), duration, distance, "ha llegado al destino");
                    await uploadProgressRoute();
                    await getRoutesById(routeId);
                    setSelectedClient(null);
                    await AsyncStorage.removeItem("timer_start");
                } else {
                    const startTime = await startTimer();
                    startMapping();
                    await uploadRoute(selectedClient2, startTime, null, null, duration, distance, "está en camino al destino");
                }
                setIsTimerRunning(!isTimerRunning);
            } else {
                throw new Error("No se pudo calcular la distancia.");
            }
        } catch (error) {
            console.error("Error al calcular distancia:", error);
            return null;
        }


    };
    const showRoutesList = () => {
        setShowRoutes(true);
        startRouteToday();
    };
    useEffect(() => {
        getUserLocation();
        startRouteToday();
    }, [])
    const fetchClients = async () => {
        try {
            const response = await axios.post(API_URL + "/whatsapp/maps/list/sales/id", {
                id_owner: idOwner,
                userCategory: "",
                salesCategory: "",
                nameClient: ""
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setClients(response.data.users);
            setFilteredClients(response.data.users);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching clients:", error);
            setLoading(false);
        }
    };
    const handleSearch = (text) => {
        const filtered = clients.filter(client =>
            `${client.name} ${client.lastName}`.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredClients(filtered);
    };
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            await fetchClients();
        };
        if (isMounted) fetchData();
        return () => { isMounted = false; };
    }, []);
    useEffect(() => {
        let interval = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer(prevTime => prevTime + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timer]);

    const centerMapOnClient = (client) => {
        setSelectedClient(client);
        setOrderId(client._id);
        setModal(true);
        mapRef.current?.animateToRegion({
            latitude: client.client_location.latitud,
            longitude: client.client_location.longitud,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 1000);
    };
    const centerMapOnClient2 = (client) => {
        setSelectedClient(client);
        //setOrderId(client._id)
        // setModal(true);
        mapRef.current?.animateToRegion({
            latitude: client.client_location.latitud,
            longitude: client.client_location.longitud,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 1000);
    };
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
    const showAllClients = () => {
        setShowClients(true);
        setShowRoute(false);
        setShowRoutes(false);

    };
    const startMapping = () => {
        setShowRoute(true);
        setShowRoutes(false);
        setShowClients(false);
    }
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };
    const handlePay = (selectedClient) => {
        navigation.navigate("OrderPickUp", { client: selectedClient });
    };
    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: -17.38156252481452,
                    longitude: -66.1613705009222,
                    latitudeDelta: 0.09,
                    longitudeDelta: 0.04
                }}
                showsUserLocation={true}
            >
                {showClients && !showRoute && filteredClients.map((client, index) => (
                    <ClientMarker key={index} client={client} />
                ))}

                {!showClients && showRoute && !showRoutes && route?.length > 0 && route[0].route?.map((point, index) => {
                    const isCurrentClient = isTimerRunning && selectedClient?.client_location._id === point.client_location._id;

                    return (
                        <React.Fragment key={index}>
                            <Marker
                                key={index}
                                coordinate={{
                                    latitude: parseFloat(point.client_location.latitud),
                                    longitude: parseFloat(point.client_location.longitud),
                                }}
                                onPress={() => {
                                    if (!isTimerRunning || selectedClient?.client_location._id === point.client_location._id) {
                                        setSelectedClient(point);
                                        setOrderId(selectedClient._id)
                                        setModal(true);
                                    }
                                }}
                            >
                                <Image
                                    source={require("../icons/tienda.png")}
                                    style={{ width: 40, height: 40 }}
                                />
                                {isCurrentClient && (
                                    <View style={{
                                        position: "absolute",
                                        top: 0,
                                        right: 0,
                                        width: 15,
                                        height: 15,
                                        backgroundColor: "blue",
                                        borderRadius: 6,
                                        borderWidth: 2,
                                        borderColor: "#fff",
                                    }} />
                                )}

                                {point.visitStatus && (
                                    <View
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            right: 0,
                                            width: 12,
                                            height: 12,
                                            backgroundColor: "#27AE60",
                                            borderRadius: 6,
                                            borderWidth: 2,
                                            borderColor: "#fff",
                                        }}
                                    />
                                )}
                            </Marker>
                            {index === 0 && route[0].route.length > 1 && (
                                <MapViewDirections
                                    origin={origin}
                                    destination={{
                                        latitude: parseFloat(route[0].route[route[0].route.length - 1].client_location.latitud),
                                        longitude: parseFloat(route[0].route[route[0].route.length - 1].client_location.longitud)
                                    }}
                                    waypoints={
                                        route[0].route.slice(0, -1).map((point) => ({
                                            latitude: parseFloat(point.client_location.latitud),
                                            longitude: parseFloat(point.client_location.longitud),
                                        }))
                                    }
                                    optimizeWaypoints={true}
                                    apikey={GOOGLE_API_KEY}
                                    strokeColor="black"
                                    strokeWidth={3}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </MapView>
            {showClients && !showRoute && !showRoutes ? (
                <View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar cliente por nombre y apellido..."
                        placeholderTextColor="#888"
                        onChangeText={handleSearch}
                    />
                    <TouchableOpacity style={styles.startRouteButton1} onPress={() => showRoutesList()}>
                        <Text style={styles.buttonText}>Ver mis rutas</Text>
                    </TouchableOpacity>
                </View>
            ) : showRoutes && !showRoute ? (
                <TouchableOpacity style={styles.startRouteButton1} onPress={() => showAllClients()}>
                    <Text style={styles.buttonText}>Volver</Text>
                </TouchableOpacity>
            ) : showRoute && route?.length > 0 && (
                <View>
                    <TouchableOpacity style={styles.startRouteButton1} onPress={() => showAllClients()}>
                        <Text style={styles.buttonText}>Ver todos</Text>
                    </TouchableOpacity>
                </View>
            )}
            {showClients && !showRoute && !showRoutes && !isTimerRunning ? (
                <View style={styles.cardsWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardsContainer}
                    >
                        {filteredClients.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.card}
                                onPress={() => centerMapOnClient2(item)}>
                                <Image
                                    source={{ uri: item.identificationImage || "https://via.placeholder.com/150" }}
                                    style={styles.cardImage}
                                />
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>{item.name} {item.lastName}</Text>
                                    <View style={styles.cardAddressContainer}>
                                        <Ionicons name="location" size={16} color="#D3423E" style={styles.locationIcon} />
                                        <Text style={styles.cardAddress}>{item.client_location.direction}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            ) : showRoutes && !showRoute && !isTimerRunning ? (
                <View style={styles.cardsWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={
                            listRoute?.length === 0
                                ? styles.emptyScrollContainer
                                : styles.cardsContainer
                        }
                    >
                        {listRoute && listRoute.length > 0 ? (
                            listRoute.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.card1}
                                    onPress={() => {
                                        setRouteId(item._id);
                                        getRoutesById(item._id);
                                        startMapping();
                                    }}
                                >
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle2}>{item.details}</Text>
                                        <View style={styles.cardAddressContainer}>
                                            <Text style={styles.cardAddress}>
                                                Fecha de Inicio: {formatDate(item.startDate)}
                                            </Text>
                                        </View>

                                        <View style={styles.progressBackground}>
                                            <View
                                                style={[
                                                    styles.progressBar,
                                                    { width: `${item.progress || 0}%`, backgroundColor: '#27AE60' },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.progressText}>{item.progress || 0}%</Text>
                                    </View>
                                </TouchableOpacity>

                            ))
                        ) : (
                            <View style={styles.emptyCard}>
                                <Ionicons name="location-off-outline" size={40} color="#ccc" style={{ marginBottom: 10 }} />
                                <Text style={styles.emptyCardTextTitle}>Sin rutas asignadas</Text>
                                <Text style={styles.emptyCardTextSubtitle}>No hay rutas disponibles para hoy.</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

            ) : showRoute && route?.length > 0 && !isTimerRunning && (
                <View style={styles.cardsWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardsContainer}
                    >
                        {route[0].route?.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.card2}
                                onPress={() => {
                                    centerMapOnClient(item);
                                }}
                            >
                                <Image
                                    source={{ uri: item.profilePicture || "https://via.placeholder.com/150" }}
                                    style={styles.cardImage}
                                />

                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>{item.name} {item.lastName}</Text>
                                    <View style={styles.cardAddressContainer}>
                                        <Ionicons name="location" size={16} color="#D3423E" style={styles.locationIcon} />
                                        <Text style={styles.cardAddress}>{item.client_location.direction}</Text>
                                    </View>
                                    <View
                                        style={{
                                            backgroundColor: item.visitStatus ? "#27AE60" : "#E74C3C",
                                            borderRadius: 20,
                                            paddingVertical: 2,
                                            paddingHorizontal: 8,
                                            alignSelf: "flex-start",
                                            marginTop: 6,
                                            marginVertical: 4,
                                        }}
                                    >
                                        <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                                            {item.visitStatus ? "Visitado" : "Sin visitar"}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
            {modality && selectedClient && (
                <View style={[styles.clientDetailCard, { bottom: insets.bottom + 150 }]}>
                    <View style={styles.modalHandle} />

                    <Text style={styles.clientDetailName}>
                        {!selectedClient.name
                            ? selectedClient.nombre
                            : `${selectedClient.name} ${selectedClient.lastName}`}
                    </Text>

                    {isTimerRunning && (
                        <>
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={20} color="#D3423E" />
                                <Text style={styles.infoText}>Distancia: {distance}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="time-outline" size={20} color="#D3423E" />
                                <Text style={styles.infoText}>Duración: {duration}</Text>
                            </View>
                        </>
                    )}

                    {!isTimerRunning && !selectedClient.visitStatus && (
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleTimerToggle(selectedClient, "Visita al cliente")}
                        >
                            <Text style={styles.primaryButtonText}>Iniciar trayecto</Text>
                        </TouchableOpacity>
                    )}

                    {isTimerRunning && (
                        <>
                            <TouchableOpacity
                                style={styles.terminateButton}
                                onPress={() => {
                                    handleTimerToggle(selectedClient, "Termina la visita");
                                    setShowRegisterButton(true);
                                }}
                            >
                                <Text style={styles.terminateButtonText}>Llegada al punto de entrega</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    {showRegisterButton && (
                        <TouchableOpacity
                            style={styles.terminateButton}
                            onPress={() => {
                                handlePay(selectedClient);
                                setShowRegisterButton(false);
                            }}
                        >
                            <Text style={styles.terminateButtonText}>Registrar entrega</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setModal(false)}>
                        <Text style={styles.secondaryButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>

            )}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#D3423E" />
                </View>
            )}
        </View>
    );
};

export default MapDelivery;
