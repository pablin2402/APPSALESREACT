import React, { useEffect, useState, useRef, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import MapView from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import axios from "axios";
import { API_URL } from "../config";
import { GOOGLE_API_KEY } from "../config";

import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { Marker } from "react-native-maps";

import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ClientMarker from "../components/ClientMarker";

import { TimerContext } from "../components/TimerContext";

import { AuthContext } from "../AuthContext";

const { width, height } = Dimensions.get("window");

const COLORS = {
  brand: "#D3423E",
  brandDark: "#bb3330",
  bg: "#f9fafb",
  card: "#ffffff",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  text: "#111827",
  textMid: "#6b7280",
  textLight: "#9ca3af",
  success: "#16a34a",
  successBg: "#dcfce7",
  warning: "#d97706",
  warningBg: "#fef3c7",
  info: "#2563eb",
  infoBg: "#eff6ff",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
};

const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffd6d4" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
];

const MapDelivery = () => {
    const { startTimer, stopTimer } = useContext(TimerContext);

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });
    const mapRef = useRef(null);
    const [distance, setDistance] = useState("");
    const [duration, setDuration] = useState("");
    const [durationInTraffic, setDurationInTraffic] = useState("");
    const [arrivalTime, setArrivalTime] = useState("");
    const [trafficLevel, setTrafficLevel] = useState("normal");
    const [orderId, setOrderId] = useState("")
    const [filteredClients, setFilteredClients] = useState([]);
    const [showRegisterButton, setShowRegisterButton] = useState(false);

    const [selectedClient, setSelectedClient] = useState(null);
    const [modality, setModal] = useState(false);

    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");

    const [activeDestination, setActiveDestination] = useState(null);

    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const [showRoute, setShowRoute] = useState(false);
    const [showClients, setShowClients] = useState(true);

    const [showRoutes, setShowRoutes] = useState(false);
    const [route, setRoute] = useState(null);
    const [listRoute, setListRoute] = useState(null);

    const localTime = new Date();
    const [routeId, setRouteId] = useState("");
    const { token, idOwner, salesId } = useContext(AuthContext);

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
                delivery: salesId,
                id_owner: idOwner,
                startDate: dateInGMTMinus4,
                excludeComplete: true,
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
    const uploadRoute = async (value, visitStartTime, visitEndTime, visitTime, tripTime1, distanceTrip1, messsageTrack, status, status1) => {
        try {
            const res = await axios.put(API_URL + "/whatsapp/route/delivery/id", {
                status: "En progreso",
                id_owner: idOwner,
                _id: routeId,
                routeId: value._id,
                visitStatus: status1,
                visitStatus1: status,
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

    const computeArrivalTime = (durationInSeconds) => {
        const arrival = new Date(Date.now() + durationInSeconds * 1000);
        return arrival.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", hour12: true });
    };

    const fetchETA = async (originCoords, destCoords) => {
        try {
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${originCoords.latitude},${originCoords.longitude}&destinations=${destCoords.latitude},${destCoords.longitude}&departure_time=now&traffic_model=best_guess&key=${GOOGLE_API_KEY}`;
            const response = await axios.get(url);
            const data = response.data;
            if (
                data.rows.length > 0 &&
                data.rows[0].elements.length > 0 &&
                data.rows[0].elements[0].status === "OK"
            ) {
                const element = data.rows[0].elements[0];
                const distanceText = element.distance.text;
                const durationText = element.duration.text;
                const durationValue = element.duration.value;
                const durationTrafficText = element.duration_in_traffic?.text || durationText;
                const durationTrafficValue = element.duration_in_traffic?.value || durationValue;

                const trafficRatio = durationTrafficValue / durationValue;
                let level = "normal";
                if (trafficRatio >= 1.5) level = "heavy";
                else if (trafficRatio >= 1.2) level = "moderate";

                setDistance(distanceText);
                setDuration(durationText);
                setDurationInTraffic(durationTrafficText);
                setArrivalTime(computeArrivalTime(durationTrafficValue));
                setTrafficLevel(level);

                return {
                    distance: distanceText,
                    duration: durationText,
                    durationInTraffic: durationTrafficText,
                    durationValue,
                    durationTrafficValue,
                    level,
                };
            }
            return null;
        } catch (error) {
            console.error("Error fetchETA:", error);
            return null;
        }
    };

    const handleTimerToggle = async (selectedClient2, text) => {

        const userLocation = await getUserLocation();
        const latitudDest = selectedClient2.client_location.latitud;
        const longitudDest = selectedClient2.client_location.longitud;

        const etaResult = await fetchETA(userLocation, {
            latitude: parseFloat(latitudDest),
            longitude: parseFloat(longitudDest),
        });

        if (!etaResult) {
            console.error("No se pudo calcular la distancia.");
            return null;
        }

        const distanceFinal = etaResult.distance;
        const durationFinal = etaResult.durationInTraffic;

        if (isTimerRunning) {
            setTimer(0);
            const stopTime = await stopTimer();
            setShowRoute(true);
            setShowClients(false);
            setActiveDestination(null);
            await uploadRoute(selectedClient2, null, stopTime, formatTime(timer), durationFinal, distanceFinal, "ha llegado al destino", "LLego al destino", true);
            await uploadProgressRoute();
            await getRoutesById(routeId);
            setSelectedClient(null);
            await AsyncStorage.removeItem("timer_start");
        } else {
            const startTime = await startTimer();
            startMapping();
            setActiveDestination({
                latitude: parseFloat(latitudDest),
                longitude: parseFloat(longitudDest),
                clientId: selectedClient2.client_location._id,
            });
            await uploadRoute(selectedClient2, startTime, null, null, durationFinal, distanceFinal, "está en camino al destino", "En camino", false);

            if (mapRef.current) {
                mapRef.current.fitToCoordinates(
                    [
                        userLocation,
                        { latitude: parseFloat(latitudDest), longitude: parseFloat(longitudDest) },
                    ],
                    {
                        edgePadding: { top: 180, right: 80, bottom: 320, left: 80 },
                        animated: true,
                    }
                );
            }
        }
        setIsTimerRunning(!isTimerRunning);
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
        setSearchTerm(text);
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

    useEffect(() => {
        let etaInterval = null;
        let locationInterval = null;

        if (isTimerRunning && activeDestination) {
            etaInterval = setInterval(async () => {
                const currentLocation = await getUserLocation();
                if (currentLocation) {
                    await fetchETA(currentLocation, {
                        latitude: activeDestination.latitude,
                        longitude: activeDestination.longitude,
                    });
                }
            }, 30000);

            locationInterval = setInterval(async () => {
                await getUserLocation();
            }, 10000);
        }

        return () => {
            if (etaInterval) clearInterval(etaInterval);
            if (locationInterval) clearInterval(locationInterval);
        };
    }, [isTimerRunning, activeDestination]);

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
        return `${day}/${month}/${year}`;
    };
    const handlePay = (selectedClient) => {
        navigation.navigate("OrderPickUp", { client: selectedClient, route: routeId });
    };

    const getDeliveryStatusStyle = (status) => {
        if (status === "LLego al destino") {
            return { bg: COLORS.successBg, color: COLORS.success, label: "ENTREGADO", icon: "checkmark-circle" };
        }
        if (status === "En camino") {
            return { bg: COLORS.warningBg, color: COLORS.warning, label: "EN CAMINO", icon: "car-sport" };
        }
        return { bg: COLORS.dangerBg, color: COLORS.brand, label: "PENDIENTE", icon: "time" };
    };

    const getTrafficStyle = (level) => {
        if (level === "heavy") return { color: COLORS.brand, bg: COLORS.dangerBg, label: "Tráfico denso" };
        if (level === "moderate") return { color: COLORS.warning, bg: COLORS.warningBg, label: "Tráfico moderado" };
        return { color: COLORS.success, bg: COLORS.successBg, label: "Tráfico fluido" };
    };

    const getRouteStrokeColor = () => {
        if (trafficLevel === "heavy") return COLORS.brand;
        if (trafficLevel === "moderate") return COLORS.warning;
        return COLORS.info;
    };

    const getHeaderTitle = () => {
        if (showClients) return "Clientes";
        if (showRoutes) return "Mis rutas";
        if (showRoute) return "Ruta activa";
        return "Entregas";
    };

    const getHeaderSubtitle = () => {
        if (showClients) return `${filteredClients.length} clientes disponibles`;
        if (showRoutes) return `${listRoute?.length || 0} ${listRoute?.length === 1 ? "ruta pendiente" : "rutas pendientes"}`;
        if (showRoute && route?.[0]) {
            const totalStops = route[0].route?.length || 0;
            const delivered = route[0].route?.filter((r) => r.visitStatus1 === "LLego al destino").length || 0;
            return `${delivered}/${totalStops} entregas`;
        }
        return "";
    };

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={styles.container}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    customMapStyle={MAP_STYLE}
                    initialRegion={{
                        latitude: -17.38156252481452,
                        longitude: -66.1613705009222,
                        latitudeDelta: 0.09,
                        longitudeDelta: 0.04
                    }}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                >
                    {showClients && !showRoute && filteredClients.map((client, index) => (
                        <ClientMarker key={index} client={client} />
                    ))}

                    {!showClients && showRoute && !showRoutes && route?.length > 0 && route[0].route?.map((point, index) => {
                        const isCurrentClient = isTimerRunning && selectedClient?.client_location._id === point.client_location._id;
                        const stopNumber = index + 1;

                        let markerBg = COLORS.brand;
                        if (point.visitStatus1 === "LLego al destino") markerBg = COLORS.success;
                        else if (point.visitStatus1 === "En camino") markerBg = COLORS.warning;
                        if (isCurrentClient) markerBg = COLORS.info;

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
                                    <View style={styles.markerWrapper}>
                                        <View style={[styles.markerCircle, { backgroundColor: markerBg }]}>
                                            {point.visitStatus1 === "LLego al destino" ? (
                                                <Ionicons name="checkmark" size={14} color="#fff" />
                                            ) : isCurrentClient ? (
                                                <Ionicons name="navigate" size={14} color="#fff" />
                                            ) : (
                                                <Text style={styles.markerText}>{stopNumber}</Text>
                                            )}
                                        </View>
                                        <View style={[styles.markerArrow, { borderTopColor: markerBg }]} />
                                    </View>
                                </Marker>
                                {!isTimerRunning && index === 0 && route[0].route.length > 1 && (
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
                                        strokeColor="#111827"
                                        strokeWidth={4}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}

                    {isTimerRunning && activeDestination && origin.latitude !== 0 && (
                        <MapViewDirections
                            origin={origin}
                            destination={{
                                latitude: activeDestination.latitude,
                                longitude: activeDestination.longitude,
                            }}
                            apikey={GOOGLE_API_KEY}
                            strokeColor={getRouteStrokeColor()}
                            strokeWidth={6}
                            mode="DRIVING"
                            precision="high"
                        />
                    )}
                </MapView>

                <SafeAreaView edges={["top"]} style={styles.topSafe}>
                    {isTimerRunning ? (
                        <View style={styles.etaPanel}>
                            <View style={styles.etaTopRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.etaLabel}>LLEGADA ESTIMADA</Text>
                                    <View style={styles.etaTimeRow}>
                                        <Text style={styles.etaTime}>{durationInTraffic || "—"}</Text>
                                        {arrivalTime ? (
                                            <Text style={styles.etaClockText}>· {arrivalTime}</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <View style={styles.timerBadgeLarge}>
                                    <View style={styles.timerDot} />
                                    <Text style={styles.timerTextLarge}>{formatTime(timer)}</Text>
                                </View>
                            </View>

                            <View style={styles.etaMetaRow}>
                                <View style={styles.etaMetaItem}>
                                    <Ionicons name="navigate" size={12} color={COLORS.info} />
                                    <Text style={styles.etaMetaText}>{distance || "—"}</Text>
                                </View>
                                <View style={[styles.trafficPill, { backgroundColor: getTrafficStyle(trafficLevel).bg }]}>
                                    <View style={[styles.trafficDot, { backgroundColor: getTrafficStyle(trafficLevel).color }]} />
                                    <Text style={[styles.trafficText, { color: getTrafficStyle(trafficLevel).color }]}>
                                        {getTrafficStyle(trafficLevel).label}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.topHeader}>
                            {(showRoutes || showRoute) && (
                                <TouchableOpacity
                                    style={styles.backBtn}
                                    onPress={showAllClients}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="arrow-back" size={18} color={COLORS.text} />
                                </TouchableOpacity>
                            )}

                            <View style={{ flex: 1 }}>
                                <Text style={styles.headerTitle} numberOfLines={1}>
                                    {getHeaderTitle()}
                                </Text>
                                <Text style={styles.headerSubtitle} numberOfLines={1}>
                                    {getHeaderSubtitle()}
                                </Text>
                            </View>

                            {showClients && (
                                <TouchableOpacity
                                    style={styles.routesBtn}
                                    onPress={showRoutesList}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="cube" size={16} color="#fff" />
                                    <Text style={styles.routesBtnText}>Mis rutas</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {showClients && !isTimerRunning && (
                        <View style={styles.searchWrap}>
                            <View style={styles.searchBox}>
                                <Ionicons name="search" size={18} color={COLORS.textMid} />
                                <TextInput
                                    placeholder="Buscar cliente..."
                                    placeholderTextColor={COLORS.textLight}
                                    value={searchTerm}
                                    onChangeText={handleSearch}
                                    style={styles.searchInput}
                                />
                                {searchTerm.length > 0 && (
                                    <TouchableOpacity onPress={() => handleSearch("")}>
                                        <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                </SafeAreaView>

                {showClients && !showRoute && !showRoutes && !isTimerRunning ? (
                    <View style={[styles.cardsWrapper, { bottom: insets.bottom + 20 }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cardsContainer}
                            decelerationRate="fast"
                            snapToInterval={width * 0.78 + 12}
                            snapToAlignment="start"
                        >
                            {filteredClients.length === 0 ? (
                                <View style={styles.emptyHorizontalCard}>
                                    <Ionicons name="people-outline" size={28} color={COLORS.textLight} />
                                    <Text style={styles.emptyHorizontalText}>Sin clientes</Text>
                                </View>
                            ) : (
                                filteredClients.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.clientCard}
                                        onPress={() => centerMapOnClient2(item)}
                                        activeOpacity={0.9}
                                    >
                                        <View style={styles.clientAvatar}>
                                            {item.identificationImage ? (
                                                <Image
                                                    source={{ uri: item.identificationImage }}
                                                    style={styles.clientAvatarImg}
                                                />
                                            ) : (
                                                <Text style={styles.clientAvatarText}>
                                                    {item.name?.[0]?.toUpperCase()}
                                                    {item.lastName?.[0]?.toUpperCase()}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.clientInfo}>
                                            <Text style={styles.clientName} numberOfLines={1}>
                                                {item.name} {item.lastName}
                                            </Text>
                                            <View style={styles.clientAddressRow}>
                                                <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                                                <Text style={styles.clientAddress} numberOfLines={1}>
                                                    {item.client_location.direction}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                ) : showRoutes && !showRoute && !isTimerRunning ? (
                    <View style={[styles.cardsWrapper, { bottom: insets.bottom + 20 }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={
                                listRoute?.length === 0
                                    ? styles.emptyScrollContainer
                                    : styles.cardsContainer
                            }
                            decelerationRate="fast"
                            snapToInterval={width * 0.78 + 12}
                            snapToAlignment="start"
                        >
                            {listRoute && listRoute.length > 0 ? (
                                listRoute.map((item, index) => {
                                    const progress = item.progress || 0;
                                    const progressColor = progress >= 100 ? COLORS.success : progress >= 50 ? COLORS.warning : COLORS.brand;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.routeCard}
                                            onPress={() => {
                                                setRouteId(item._id);
                                                getRoutesById(item._id);
                                                startMapping();
                                            }}
                                            activeOpacity={0.9}
                                        >
                                            <View style={styles.routeCardTop}>
                                                <View style={styles.routeIconBox}>
                                                    <Ionicons name="cube" size={16} color={COLORS.brand} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.routeCardTitle} numberOfLines={1}>
                                                        {item.details}
                                                    </Text>
                                                    <Text style={styles.routeCardDate}>
                                                        <Ionicons name="calendar-outline" size={10} />
                                                        {"  "}
                                                        {formatDate(item.startDate)}
                                                    </Text>
                                                </View>
                                                <View style={[styles.progressPill, { backgroundColor: `${progressColor}1A` }]}>
                                                    <Text style={[styles.progressPillText, { color: progressColor }]}>{progress}%</Text>
                                                </View>
                                            </View>
                                            <View style={styles.progressTrack}>
                                                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: progressColor }]} />
                                            </View>
                                            <View style={styles.routeCardFooter}>
                                                <Text style={styles.routeCardFooterText}>Toca para ver detalles</Text>
                                                <Ionicons name="chevron-forward" size={14} color={COLORS.brand} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                <View style={styles.emptyCard}>
                                    <Ionicons name="cube-outline" size={36} color={COLORS.textLight} />
                                    <Text style={styles.emptyCardTitle}>Sin rutas asignadas</Text>
                                    <Text style={styles.emptyCardSubtitle}>No hay rutas disponibles para hoy</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                ) : showRoute && route?.length > 0 && !isTimerRunning && (
                    <View style={[styles.cardsWrapper, { bottom: insets.bottom + 20 }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cardsContainer}
                            decelerationRate="fast"
                            snapToInterval={width * 0.78 + 12}
                            snapToAlignment="start"
                        >
                            {route[0].route?.map((item, index) => {
                                const status = getDeliveryStatusStyle(item.visitStatus1);
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.stopCard}
                                        onPress={() => {
                                            centerMapOnClient(item);
                                        }}
                                        activeOpacity={0.9}
                                    >
                                        <View style={styles.stopHeader}>
                                            <View style={styles.stopNumberBadge}>
                                                <Text style={styles.stopNumberText}>{index + 1}</Text>
                                            </View>
                                            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                                                <Ionicons name={status.icon} size={10} color={status.color} />
                                                <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.stopName} numberOfLines={1}>{item.name} {item.lastName}</Text>
                                        <View style={styles.stopAddressRow}>
                                            <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                                            <Text style={styles.stopAddress} numberOfLines={2}>
                                                {item.client_location.direction}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {modality && selectedClient && (
                    <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={styles.modalHandle} />

                        <View style={styles.bottomSheetHeader}>
                            <View style={styles.bottomSheetAvatar}>
                                {selectedClient.identificationImage || selectedClient.profilePicture ? (
                                    <Image
                                        source={{ uri: selectedClient.identificationImage || selectedClient.profilePicture }}
                                        style={styles.bottomSheetAvatarImg}
                                    />
                                ) : (
                                    <Text style={styles.bottomSheetAvatarText}>
                                        {(selectedClient.name || selectedClient.nombre || "?")[0]?.toUpperCase()}
                                        {selectedClient.lastName?.[0]?.toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.bottomSheetName} numberOfLines={1}>
                                    {!selectedClient.name
                                        ? selectedClient.nombre
                                        : `${selectedClient.name} ${selectedClient.lastName}`}
                                </Text>
                                {selectedClient.client_location?.direction && (
                                    <View style={styles.bottomSheetAddressRow}>
                                        <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                                        <Text style={styles.bottomSheetAddress} numberOfLines={1}>
                                            {selectedClient.client_location.direction}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.bottomSheetClose}
                                onPress={() => setModal(false)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textMid} />
                            </TouchableOpacity>
                        </View>

                        {isTimerRunning && (
                            <View style={styles.tripInfoRow}>
                                <View style={styles.tripInfoCard}>
                                    <View style={[styles.tripInfoIcon, { backgroundColor: COLORS.infoBg }]}>
                                        <Ionicons name="navigate" size={14} color={COLORS.info} />
                                    </View>
                                    <View>
                                        <Text style={styles.tripInfoLabel}>Distancia</Text>
                                        <Text style={styles.tripInfoValue}>{distance || "—"}</Text>
                                    </View>
                                </View>
                                <View style={styles.tripInfoCard}>
                                    <View style={[styles.tripInfoIcon, { backgroundColor: COLORS.warningBg }]}>
                                        <Ionicons name="time" size={14} color={COLORS.warning} />
                                    </View>
                                    <View>
                                        <Text style={styles.tripInfoLabel}>Con tráfico</Text>
                                        <Text style={styles.tripInfoValue}>{durationInTraffic || "—"}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.bottomSheetActions}>
                            {!isTimerRunning && !selectedClient.visitStatus && (
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => handleTimerToggle(selectedClient, "Visita al cliente")}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="navigate" size={16} color="#fff" />
                                    <Text style={styles.primaryButtonText}>Iniciar trayecto</Text>
                                </TouchableOpacity>
                            )}

                            {isTimerRunning && (
                                <TouchableOpacity
                                    style={styles.successButton}
                                    onPress={() => {
                                        handleTimerToggle(selectedClient, "Termina la visita");
                                        setShowRegisterButton(true);
                                    }}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="flag" size={16} color="#fff" />
                                    <Text style={styles.primaryButtonText}>Llegada al punto de entrega</Text>
                                </TouchableOpacity>
                            )}

                            {showRegisterButton && (
                                <TouchableOpacity
                                    style={styles.brandButton}
                                    onPress={() => {
                                        handlePay(selectedClient, route);
                                        setShowRegisterButton(false);
                                    }}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="cube" size={16} color="#fff" />
                                    <Text style={styles.primaryButtonText}>Registrar entrega</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingCard}>
                            <ActivityIndicator size="large" color={COLORS.brand} />
                            <Text style={styles.loadingText}>Cargando mapa...</Text>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    topSafe: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
    topHeader: {
        marginHorizontal: 16,
        marginTop: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderRadius: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 6,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.borderLight,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    headerSubtitle: { fontSize: 11, color: COLORS.textMid, fontWeight: "500", marginTop: 2 },
    routesBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: COLORS.brand,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    routesBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

    etaPanel: {
        marginHorizontal: 16,
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 18,
        elevation: 10,
    },
    etaTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    etaLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: COLORS.textMid,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginBottom: 2,
    },
    etaTimeRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    etaTime: {
        fontSize: 26,
        fontWeight: "800",
        color: COLORS.text,
        fontVariant: ["tabular-nums"],
    },
    etaClockText: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.textMid,
        fontVariant: ["tabular-nums"],
    },
    timerBadgeLarge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: COLORS.warningBg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    timerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning },
    timerTextLarge: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.warning,
        fontVariant: ["tabular-nums"],
    },
    etaMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    etaMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    etaMetaText: { fontSize: 13, fontWeight: "700", color: COLORS.text },
    trafficPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    trafficDot: { width: 6, height: 6, borderRadius: 3 },
    trafficText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },

    searchWrap: { paddingHorizontal: 16, marginTop: 8 },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#fff",
        paddingHorizontal: 14,
        height: 46,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0 },

    markerWrapper: { alignItems: "center" },
    markerCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3,
        elevation: 4,
    },
    markerText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    markerArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 7,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        marginTop: -2,
    },

    cardsWrapper: { position: "absolute", left: 0, right: 0 },
    cardsContainer: { paddingHorizontal: 16, paddingVertical: 4, gap: 12 },
    emptyScrollContainer: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 },

    clientCard: {
        width: width * 0.78,
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 6,
    },
    clientAvatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: COLORS.dangerBg,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    clientAvatarImg: { width: "100%", height: "100%" },
    clientAvatarText: {
        fontSize: 16,
        fontWeight: "800",
        color: COLORS.brand,
        letterSpacing: 0.5,
    },
    clientInfo: { flex: 1 },
    clientName: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
    clientAddressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    clientAddress: { flex: 1, fontSize: 11, color: COLORS.textMid, fontWeight: "500" },

    routeCard: {
        width: width * 0.78,
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 6,
    },
    routeCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    routeIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: COLORS.dangerBg,
        justifyContent: "center",
        alignItems: "center",
    },
    routeCardTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginBottom: 2 },
    routeCardDate: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },
    progressPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    progressPillText: { fontSize: 11, fontWeight: "800" },
    progressTrack: {
        height: 6,
        backgroundColor: COLORS.borderLight,
        borderRadius: 999,
        overflow: "hidden",
        marginBottom: 10,
    },
    progressFill: { height: "100%", borderRadius: 999 },
    routeCardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    routeCardFooterText: { fontSize: 11, fontWeight: "700", color: COLORS.brand },

    emptyCard: {
        width: width - 32,
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    emptyCardTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginTop: 10 },
    emptyCardSubtitle: {
        fontSize: 12,
        color: COLORS.textMid,
        marginTop: 4,
        textAlign: "center",
    },
    emptyHorizontalCard: {
        width: width - 32,
        paddingVertical: 28,
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 18,
    },
    emptyHorizontalText: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.textMid,
        marginTop: 8,
    },

    stopCard: {
        width: width * 0.78,
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 6,
    },
    stopHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    stopNumberBadge: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: COLORS.brand,
        justifyContent: "center",
        alignItems: "center",
    },
    stopNumberText: { color: "#fff", fontSize: 13, fontWeight: "800" },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
    stopName: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
    stopAddressRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
    stopAddress: {
        flex: 1,
        fontSize: 11,
        color: COLORS.textMid,
        fontWeight: "500",
        lineHeight: 15,
    },

    bottomSheet: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: -6 },
        shadowRadius: 16,
        elevation: 12,
    },
    modalHandle: {
        alignSelf: "center",
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        marginBottom: 16,
    },
    bottomSheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 14,
    },
    bottomSheetAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.dangerBg,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    bottomSheetAvatarImg: { width: "100%", height: "100%" },
    bottomSheetAvatarText: {
        fontSize: 16,
        fontWeight: "800",
        color: COLORS.brand,
        letterSpacing: 0.5,
    },
    bottomSheetName: { fontSize: 16, fontWeight: "800", color: COLORS.text },
    bottomSheetAddressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 3,
    },
    bottomSheetAddress: { flex: 1, fontSize: 12, color: COLORS.textMid, fontWeight: "500" },
    bottomSheetClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.borderLight,
        justifyContent: "center",
        alignItems: "center",
    },

    tripInfoRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
    tripInfoCard: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderRadius: 14,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    tripInfoIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    tripInfoLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: COLORS.textMid,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    tripInfoValue: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginTop: 1 },

    bottomSheetActions: { gap: 8 },
    primaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: COLORS.info,
        shadowColor: COLORS.info,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    successButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: COLORS.success,
        shadowColor: COLORS.success,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    brandButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: COLORS.brand,
        shadowColor: COLORS.brand,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "800",
        letterSpacing: 0.3,
    },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingCard: {
        backgroundColor: "#fff",
        paddingVertical: 24,
        paddingHorizontal: 30,
        borderRadius: 18,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 6,
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.textMid,
        fontSize: 13,
        fontWeight: "600",
    },
});

export default MapDelivery;