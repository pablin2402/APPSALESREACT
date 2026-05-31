import React, { useEffect, useState, useRef, useContext, useMemo } from "react";
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
import MapView, { Marker, Polygon } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import axios from "axios";
import { API_URL, GOOGLE_API_KEY } from "../config";

import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";

import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ClientMarker from "../utils/ClientMaker";

import { TimerContext } from "./TimerContext";
import { AuthContext } from "../AuthContext";

import StackingPlanSheet from "../utils/Stackingplansheet";
import OrderDetailsCardScreen from "../screen/OrderDetailsCardScreen";
import {
    calculateRouteSummary,
    consolidateOrdersByClient,
} from "../utils/Routeoptimizermobile";

import {
    MUNICIPIOS_COCHABAMBA,
    inferZoneFromClient,
    getCategoryConfig,
} from "../utils/MunicipiosCochabamba";

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

const STORAGE_KEYS = {
    routeId: "mapdelivery_route_id",
    activeDest: "mapdelivery_active_dest",
    selectedClientLocId: "mapdelivery_selected_loc_id",
    orderId: "mapdelivery_order_id",
    isTimerRunning: "mapdelivery_timer_running",
    deliveryRegistered: "mapdelivery_delivery_registered",
    startTimestamp: "mapdelivery_start_ts",
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

const ALL_ZONES_KEY = "__ALL__";

const MapScreenDelivery = () => {
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
    const [orderId, setOrderId] = useState("");

    const [selectedStop, setSelectedStop] = useState(null);
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

    const [routeId, setRouteId] = useState("");
    const { token, idOwner, salesId } = useContext(AuthContext);
    const [deliveryRegistered, setDeliveryRegistered] = useState(false);

    const [showStackingPlan, setShowStackingPlan] = useState(false);

    // Filtro de zona
    const [selectedZone, setSelectedZone] = useState(ALL_ZONES_KEY);
    const [showZonePicker, setShowZonePicker] = useState(false);
    const [showPolygons, setShowPolygons] = useState(true);

    const routeSummary = useMemo(
        () => calculateRouteSummary(route),
        [route]
    );

    const consolidatedStops = useMemo(
        () => routeSummary?.consolidatedStops || [],
        [routeSummary]
    );

    const clientsWithZone = useMemo(() => {
        return (clients || []).map((c) => ({
            ...c,
            __zone: inferZoneFromClient(c),
        }));
    }, [clients]);

    const filteredClients = useMemo(() => {
        let arr = clientsWithZone;
        if (selectedZone !== ALL_ZONES_KEY) {
            arr = arr.filter((c) => c.__zone === selectedZone);
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            arr = arr.filter((c) =>
                `${c.name || ""} ${c.lastName || ""} ${c.client_location?.sucursalName || ""}`
                    .toLowerCase()
                    .includes(q)
            );
        }
        return arr;
    }, [clientsWithZone, selectedZone, searchTerm]);

    const zoneCount = useMemo(() => {
        const c = {};
        clientsWithZone.forEach((cl) => {
            c[cl.__zone] = (c[cl.__zone] || 0) + 1;
        });
        return c;
    }, [clientsWithZone]);

    function getStartOfDayInUTCMinus4(date) {
        const utcDate = new Date(date);
        utcDate.setHours(utcDate.getHours() - 4);
        return utcDate.toISOString();
    }
    const today = new Date();

    const persistActiveTrip = async ({ rid, dest, locId, oId }) => {
        try {
            await AsyncStorage.multiSet([
                [STORAGE_KEYS.routeId, rid || ""],
                [STORAGE_KEYS.activeDest, JSON.stringify(dest || null)],
                [STORAGE_KEYS.selectedClientLocId, locId || ""],
                [STORAGE_KEYS.orderId, oId || ""],
                [STORAGE_KEYS.isTimerRunning, "true"],
                [STORAGE_KEYS.startTimestamp, String(Date.now())],
            ]);
        } catch (e) {}
    };

    const clearActiveTrip = async () => {
        try {
            await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
        } catch (e) {}
    };

    const startRouteToday = async () => {
        const dateInGMTMinus4 = getStartOfDayInUTCMinus4(today);
        try {
            const response = await axios.post(
                API_URL + "/whatsapp/delivery/list/route",
                {
                    delivery: salesId,
                    id_owner: idOwner,
                    startDate: dateInGMTMinus4,
                    excludeComplete: true,
                    status: "",
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setListRoute(response.data.data);
        } catch (error) {}
    };

    const getRoutesById = async (value) => {
        try {
            const response = await axios.post(
                API_URL + "/whatsapp/delivery/list/route/id",
                { _id: value, id_owner: idOwner },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRoute(response.data);
            console.log(response.data)
            return response.data;
        } catch (error) {
            return null;
        }
    };

    const uploadRoute = async (orderToUpdate, visitStartTime, visitEndTime, visitTime, tripTime1, distanceTrip1, messsageTrack, status, status1) => {
        try {
            const res = await axios.put(
                API_URL + "/whatsapp/route/delivery/id",
                {
                    status: "En progreso",
                    id_owner: idOwner,
                    _id: routeId,
                    routeId: orderToUpdate._id,
                    visitStatus: status1,
                    visitStatus1: status,
                    visitTime: visitTime,
                    orderTaken: false,
                    visitStartTime: visitStartTime,
                    visitEndTime: visitEndTime,
                    tripTime: tripTime1,
                    distanceTrip: distanceTrip1,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.status === 200) {
                await axios.post(
                    API_URL + "/whatsapp/order/track",
                    {
                        orderId: orderToUpdate._id,
                        eventType: messsageTrack,
                        triggeredBySalesman: "",
                        triggeredByDelivery: salesId,
                        triggeredByUser: "",
                        location: { lat: 0, lng: 0 },
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
        } catch (error) {}
    };

    const uploadProgressRoute = async () => {
        try {
            await axios.put(
                API_URL + "/whatsapp/route/delivery/progress/id",
                { id_owner: idOwner, _id: routeId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {}
    };

    async function getUserLocation() {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        let location = await Location.getCurrentPositionAsync({});
        const current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
        setOrigin((prevOrigin) => {
            if (prevOrigin.latitude !== current.latitude || prevOrigin.longitude !== current.longitude) {
                return current;
            }
            return prevOrigin;
        });
        return current;
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
            return null;
        }
    };

    const handleStartTrip = async (stop) => {
        const userLocation = await getUserLocation();
        if (!userLocation) return;

        const latitudDest = stop.client_location.latitud;
        const longitudDest = stop.client_location.longitud;

        const etaResult = await fetchETA(userLocation, {
            latitude: parseFloat(latitudDest),
            longitude: parseFloat(longitudDest),
        });
        if (!etaResult) return;

        const distanceFinal = etaResult.distance;
        const durationFinal = etaResult.durationInTraffic;

        const startTime = await startTimer();
        startMapping();

        const newDest = {
            latitude: parseFloat(latitudDest),
            longitude: parseFloat(longitudDest),
            clientId: stop.client_location._id,
        };
        setActiveDestination(newDest);

        const firstOrder = stop.orders?.[0] || stop;

        await persistActiveTrip({
            rid: routeId,
            dest: newDest,
            locId: stop.client_location._id,
            oId: firstOrder._id,
        });

        if (stop.orders && stop.orders.length > 0) {
            for (const order of stop.orders) {
                await uploadRoute(
                    order,
                    startTime, null, null,
                    durationFinal, distanceFinal,
                    "está en camino al destino",
                    "En camino", false
                );
            }
        } else {
            await uploadRoute(
                stop,
                startTime, null, null,
                durationFinal, distanceFinal,
                "está en camino al destino",
                "En camino", false
            );
        }

        setIsTimerRunning(true);
        setDeliveryRegistered(false);
        await AsyncStorage.removeItem(STORAGE_KEYS.deliveryRegistered);

        if (mapRef.current) {
            mapRef.current.fitToCoordinates(
                [userLocation, { latitude: parseFloat(latitudDest), longitude: parseFloat(longitudDest) }],
                {
                    edgePadding: { top: 180, right: 80, bottom: 320, left: 80 },
                    animated: true,
                }
            );
        }
    };

    const handleFinishTrip = async (stop) => {
        const userLocation = await getUserLocation();
        if (!userLocation) return;

        const latitudDest = stop.client_location.latitud;
        const longitudDest = stop.client_location.longitud;

        const etaResult = await fetchETA(userLocation, {
            latitude: parseFloat(latitudDest),
            longitude: parseFloat(longitudDest),
        });

        const distanceFinal = etaResult?.distance || distance || "";
        const durationFinal = etaResult?.durationInTraffic || durationInTraffic || "";

        const visitTimeStr = formatTime(timer);
        setTimer(0);
        const stopTime = await stopTimer();
        setShowRoute(true);
        setShowClients(false);
        setActiveDestination(null);

        if (stop.orders && stop.orders.length > 0) {
            for (const order of stop.orders) {
                await uploadRoute(
                    order,
                    null, stopTime, visitTimeStr,
                    durationFinal, distanceFinal,
                    "ha llegado al destino",
                    "LLego al destino", true
                );
            }
        } else {
            await uploadRoute(
                stop,
                null, stopTime, visitTimeStr,
                durationFinal, distanceFinal,
                "ha llegado al destino",
                "LLego al destino", true
            );
        }

        await uploadProgressRoute();
        await getRoutesById(routeId);
        setSelectedStop(null);
        setModal(false);
        setIsTimerRunning(false);
        setDeliveryRegistered(false);
        await clearActiveTrip();
        await AsyncStorage.removeItem("timer_start");
    };

    const showRoutesList = () => {
        setShowRoutes(true);
        startRouteToday();
    };

    useEffect(() => {
        const init = async () => {
            await getUserLocation();
            await startRouteToday();

            try {
                const values = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
                const map = Object.fromEntries(values);

                const storedRouteId = map[STORAGE_KEYS.routeId];
                if (storedRouteId) {
                    setRouteId(storedRouteId);
                    const routeData = await getRoutesById(storedRouteId);
                    setShowRoute(true);
                    setShowClients(false);
                    setShowRoutes(false);

                    const storedDestStr = map[STORAGE_KEYS.activeDest];
                    if (storedDestStr && storedDestStr !== "null") {
                        try {
                            const dest = JSON.parse(storedDestStr);
                            if (dest) setActiveDestination(dest);
                        } catch (e) {}
                    }

                    const storedClientLocId = map[STORAGE_KEYS.selectedClientLocId];
                    if (storedClientLocId && routeData?.[0]?.route) {
                        const stops = consolidateOrdersByClient(routeData[0].route);
                        const stop = stops.find(s => s.client_location?._id === storedClientLocId);
                        if (stop) setSelectedStop(stop);
                    }

                    const storedOrderId = map[STORAGE_KEYS.orderId];
                    if (storedOrderId) setOrderId(storedOrderId);

                    if (map[STORAGE_KEYS.isTimerRunning] === "true") {
                        setIsTimerRunning(true);
                        const tsStr = map[STORAGE_KEYS.startTimestamp];
                        if (tsStr) {
                            const elapsed = Math.floor((Date.now() - parseInt(tsStr, 10)) / 1000);
                            if (elapsed > 0 && elapsed < 86400) setTimer(elapsed);
                        }
                    }
                    if (map[STORAGE_KEYS.deliveryRegistered] === "true") {
                        setDeliveryRegistered(true);
                    }
                }
            } catch (e) {}
        };
        init();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const checkRegisteredFlag = async () => {
                try {
                    const flag = await AsyncStorage.getItem(STORAGE_KEYS.deliveryRegistered);
                    if (flag === "true" && !deliveryRegistered) {
                        setDeliveryRegistered(true);
                        if (routeId) await getRoutesById(routeId);
                    }
                } catch (e) {}
            };
            checkRegisteredFlag();
        }, [deliveryRegistered, routeId])
    );

    const fetchClients = async () => {
        try {
            const response = await axios.post(
                API_URL + "/whatsapp/maps/list/sales/id",
                {
                    id_owner: idOwner,
                    userCategory: "",
                    salesCategory: "",
                    nameClient: "",
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setClients(response.data.users);
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => { await fetchClients(); };
        if (isMounted) fetchData();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        let interval = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer((prevTime) => prevTime + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

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

    const openClientSheet = (client) => {
        const stopLike = {
            ...client,
            client_location: client.client_location,
            name: client.name,
            lastName: client.lastName,
            orders: client.orders || [],
            totalBoxes: client.totalBoxes || 0,
            totalAmount: client.totalAmount || 0,
        };
        setSelectedStop(stopLike);
        setModal(true);
        mapRef.current?.animateToRegion(
            {
                latitude: Number(client.client_location.latitud),
                longitude: Number(client.client_location.longitud),
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
            },
            800
        );
    };

    const centerMapOnStop = (stop) => {
        setSelectedStop(stop);
        const firstOrder = stop.orders?.[0] || stop;
        setOrderId(firstOrder._id);
        setModal(true);
        mapRef.current?.animateToRegion(
            {
                latitude: parseFloat(stop.client_location.latitud),
                longitude: parseFloat(stop.client_location.longitud),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            },
            1000
        );
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleOpenDeliveryForm = (stop) => {
        const firstOrder = stop.orders?.[0] || stop;
        navigation.navigate("OrderPickUp", {
            client: firstOrder,
            route: routeId,
            allOrders: stop.orders || [stop],
            onDeliveryRegistered: async () => {
                setDeliveryRegistered(true);
                await AsyncStorage.setItem(STORAGE_KEYS.deliveryRegistered, "true");
                if (routeId) await getRoutesById(routeId);
            },
        });
    };

    const getDeliveryStatusStyle = (status) => {
        if (status === "LLego al destino") {
            return { bg: COLORS.successBg, color: COLORS.success, label: "ENTREGADO", icon: "checkmark-circle" };
        }
        if (status === "Pedido entregado") {
            return { bg: COLORS.infoBg, color: COLORS.info, label: "POR FINALIZAR", icon: "cube" };
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
        if (showClients) {
            if (selectedZone !== ALL_ZONES_KEY) {
                return `${filteredClients.length} en ${selectedZone}`;
            }
            return `${filteredClients.length} clientes disponibles`;
        }
        if (showRoutes)
            return `${listRoute?.length || 0} ${listRoute?.length === 1 ? "ruta pendiente" : "rutas pendientes"}`;
        if (showRoute && consolidatedStops.length > 0) {
            const delivered = consolidatedStops.filter((s) => s.visitStatus1 === "LLego al destino").length;
            return `${delivered}/${consolidatedStops.length} paradas`;
        }
        return "";
    };

    const isAlreadyDelivered = selectedStop?.visitStatus1 === "LLego al destino";
    const hasStackingPlan = showRoute && route?.[0] && routeSummary?.totalBoxes > 0;

    const zoneCfg = selectedZone === ALL_ZONES_KEY
        ? { name: "Todas las zonas", color: COLORS.brand, bgLight: COLORS.dangerBg }
        : MUNICIPIOS_COCHABAMBA[selectedZone];

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
                        longitudeDelta: 0.04,
                    }}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                >
                    {showClients && !showRoute && showPolygons &&
Object.entries(MUNICIPIOS_COCHABAMBA).map(([key, m]) => {

    if (!m.paths) return null;

    const isSelected = selectedZone === key;
    const isFiltered =
        selectedZone !== ALL_ZONES_KEY && !isSelected;

    return (
        <Polygon
            key={key}
            coordinates={m.paths.map(p => ({
                latitude: p.lat,
                longitude: p.lng,
            }))}
            strokeColor={
                isFiltered ? `${m.strokeColor}40` : m.strokeColor
            }
            fillColor={
                isSelected
                    ? `${m.fillColor}30`
                    : (isFiltered
                        ? `${m.fillColor}08`
                        : `${m.fillColor}15`)
            }
            strokeWidth={isSelected ? 3 : 1.5}
        />
    );
})}

                    {showClients && !showRoute &&
                        filteredClients.map((client, index) => (
                            <ClientMarker
                                key={client._id || index}
                                client={client}
                                onPress={() => openClientSheet(client)}
                            />
                        ))}

                    {!showClients &&
                        showRoute &&
                        !showRoutes &&
                        consolidatedStops.length > 0 &&
                        consolidatedStops.map((stop, index) => {
                            const isCurrentClient =
                                isTimerRunning &&
                                selectedStop?.client_location?._id === stop.client_location._id;
                            const stopNumber = index + 1;

                            let markerBg = COLORS.brand;
                            let markerIcon = null;
                            if (stop.visitStatus1 === "LLego al destino") {
                                markerBg = COLORS.success;
                                markerIcon = "checkmark";
                            } else if (stop.visitStatus1 === "Pedido entregado") {
                                markerBg = COLORS.info;
                                markerIcon = "cube";
                            } else if (stop.visitStatus1 === "En camino") {
                                markerBg = COLORS.warning;
                            }
                            if (isCurrentClient) {
                                markerBg = COLORS.info;
                                markerIcon = "navigate";
                            }

                            const hasMultipleOrders = stop.orders.length > 1;

                            return (
                                <React.Fragment key={index}>
                                    <Marker
                                        coordinate={{
                                            latitude: parseFloat(stop.client_location.latitud),
                                            longitude: parseFloat(stop.client_location.longitud),
                                        }}
                                        onPress={() => {
                                            if (
                                                !isTimerRunning ||
                                                selectedStop?.client_location?._id === stop.client_location._id
                                            ) {
                                                setSelectedStop(stop);
                                                const firstOrder = stop.orders?.[0] || stop;
                                                setOrderId(firstOrder._id);
                                                setModal(true);
                                            }
                                        }}
                                    >
                                        <View style={styles.markerWrapper}>
                                            <View style={[styles.markerCircle, { backgroundColor: markerBg }]}>
                                                {markerIcon ? (
                                                    <Ionicons name={markerIcon} size={14} color="#fff" />
                                                ) : (
                                                    <Text style={styles.markerText}>{stopNumber}</Text>
                                                )}
                                            </View>
                                            {hasMultipleOrders && (
                                                <View style={styles.multiOrderBadge}>
                                                    <Text style={styles.multiOrderBadgeText}>
                                                        {stop.orders.length}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={[styles.markerArrow, { borderTopColor: markerBg }]} />
                                        </View>
                                    </Marker>
                                    {!isTimerRunning && index === 0 && consolidatedStops.length > 1 && (
                                        <MapViewDirections
                                            origin={origin}
                                            destination={{
                                                latitude: parseFloat(
                                                    consolidatedStops[consolidatedStops.length - 1].client_location.latitud
                                                ),
                                                longitude: parseFloat(
                                                    consolidatedStops[consolidatedStops.length - 1].client_location.longitud
                                                ),
                                            }}
                                            waypoints={consolidatedStops.slice(0, -1).map((s) => ({
                                                latitude: parseFloat(s.client_location.latitud),
                                                longitude: parseFloat(s.client_location.longitud),
                                            }))}
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
                                    <Text style={styles.etaLabel}>
                                        {deliveryRegistered ? "ENTREGA REGISTRADA · FINALIZAR" : "LLEGADA ESTIMADA"}
                                    </Text>
                                    <View style={styles.etaTimeRow}>
                                        <Text style={styles.etaTime}>
                                            {deliveryRegistered ? "Listo" : durationInTraffic || "—"}
                                        </Text>
                                        {!deliveryRegistered && arrivalTime ? (
                                            <Text style={styles.etaClockText}>· {arrivalTime}</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <View
                                    style={[
                                        styles.timerBadgeLarge,
                                        deliveryRegistered && { backgroundColor: COLORS.successBg },
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.timerDot,
                                            deliveryRegistered && { backgroundColor: COLORS.success },
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.timerTextLarge,
                                            deliveryRegistered && { color: COLORS.success },
                                        ]}
                                    >
                                        {formatTime(timer)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.etaMetaRow}>
                                <View style={styles.etaMetaItem}>
                                    <Ionicons name="navigate" size={12} color={COLORS.info} />
                                    <Text style={styles.etaMetaText}>{distance || "—"}</Text>
                                </View>
                                {deliveryRegistered ? (
                                    <View style={[styles.trafficPill, { backgroundColor: COLORS.successBg }]}>
                                        <Ionicons name="checkmark-circle" size={11} color={COLORS.success} />
                                        <Text style={[styles.trafficText, { color: COLORS.success }]}>
                                            Entrega registrada
                                        </Text>
                                    </View>
                                ) : (
                                    <View
                                        style={[styles.trafficPill, { backgroundColor: getTrafficStyle(trafficLevel).bg }]}
                                    >
                                        <View style={[styles.trafficDot, { backgroundColor: getTrafficStyle(trafficLevel).color }]} />
                                        <Text style={[styles.trafficText, { color: getTrafficStyle(trafficLevel).color }]}>
                                            {getTrafficStyle(trafficLevel).label}
                                        </Text>
                                    </View>
                                )}
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

                            {hasStackingPlan && (
                                <TouchableOpacity
                                    style={styles.loadingPlanBtn}
                                    onPress={() => setShowStackingPlan(true)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.loadingPlanIcon}>
                                        <Ionicons name="cube" size={14} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={styles.loadingPlanBtnText}>
                                            {routeSummary.totalBoxes} cajas
                                        </Text>
                                        <Text style={styles.loadingPlanBtnSubtext}>Plan de carga</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {showClients && !isTimerRunning && (
                        <>
                            <View style={styles.searchWrap}>
                                <View style={styles.searchBox}>
                                    <Ionicons name="search" size={18} color={COLORS.textMid} />
                                    <TextInput
                                        placeholder="Buscar cliente..."
                                        placeholderTextColor={COLORS.textLight}
                                        value={searchTerm}
                                        onChangeText={setSearchTerm}
                                        style={styles.searchInput}
                                    />
                                    {searchTerm.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchTerm("")}>
                                            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <View style={styles.zoneChipsWrap}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.zoneChipsContent}
                                >
                                    <TouchableOpacity
                                        onPress={() => setSelectedZone(ALL_ZONES_KEY)}
                                        style={[
                                            styles.zoneChip,
                                            selectedZone === ALL_ZONES_KEY && {
                                                backgroundColor: COLORS.brand,
                                                borderColor: COLORS.brand,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name="apps"
                                            size={11}
                                            color={selectedZone === ALL_ZONES_KEY ? "#fff" : COLORS.textMid}
                                        />
                                        <Text
                                            style={[
                                                styles.zoneChipText,
                                                selectedZone === ALL_ZONES_KEY && { color: "#fff" },
                                            ]}
                                        >
                                            Todas
                                        </Text>
                                        <View
                                            style={[
                                                styles.zoneChipBadge,
                                                selectedZone === ALL_ZONES_KEY && { backgroundColor: "rgba(255,255,255,0.25)" },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.zoneChipBadgeText,
                                                    selectedZone === ALL_ZONES_KEY && { color: "#fff" },
                                                ]}
                                            >
                                                {clientsWithZone.length}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {Object.entries(MUNICIPIOS_COCHABAMBA).map(([key, m]) => {
                                        const isSelected = selectedZone === key;
                                        const count = zoneCount[key] || 0;
                                        return (
                                            <TouchableOpacity
                                                key={key}
                                                onPress={() => setSelectedZone(key)}
                                                style={[
                                                    styles.zoneChip,
                                                    isSelected && {
                                                        backgroundColor: m.color,
                                                        borderColor: m.color,
                                                    },
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        styles.zoneDot,
                                                        { backgroundColor: isSelected ? "#fff" : m.color },
                                                    ]}
                                                />
                                                <Text
                                                    style={[
                                                        styles.zoneChipText,
                                                        isSelected && { color: "#fff" },
                                                    ]}
                                                >
                                                    {m.name}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.zoneChipBadge,
                                                        isSelected && { backgroundColor: "rgba(255,255,255,0.25)" },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.zoneChipBadgeText,
                                                            isSelected && { color: "#fff" },
                                                        ]}
                                                    >
                                                        {count}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}

                                    <TouchableOpacity
                                        onPress={() => setShowPolygons(!showPolygons)}
                                        style={[
                                            styles.togglePolyChip,
                                            !showPolygons && { backgroundColor: "#fff", borderColor: COLORS.border },
                                        ]}
                                    >
                                        <Ionicons
                                            name={showPolygons ? "eye" : "eye-off"}
                                            size={12}
                                            color={showPolygons ? COLORS.brand : COLORS.textMid}
                                        />
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </>
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
                                    <Text style={styles.emptyHorizontalText}>
                                        {selectedZone !== ALL_ZONES_KEY
                                            ? `Sin clientes en ${selectedZone}`
                                            : "Sin clientes"}
                                    </Text>
                                </View>
                            ) : (
                                filteredClients.map((item, index) => {
                                    const cfg = getCategoryConfig(item.userCategory);
                                    const zone = MUNICIPIOS_COCHABAMBA[item.__zone];
                                    return (
                                        <TouchableOpacity
                                            key={item._id || index}
                                            style={styles.clientCard}
                                            onPress={() => openClientSheet(item)}
                                            activeOpacity={0.9}
                                        >
                                            <View style={[styles.clientAvatar, { backgroundColor: cfg.bg }]}>
                                                {item.identificationImage ? (
                                                    <Image
                                                        source={{ uri: item.identificationImage }}
                                                        style={styles.clientAvatarImg}
                                                    />
                                                ) : (
                                                    <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                                                )}
                                            </View>
                                            <View style={styles.clientInfo}>
                                                <Text style={styles.clientName} numberOfLines={1}>
                                                    {item.client_location?.sucursalName ||
                                                        `${item.name} ${item.lastName}`}
                                                </Text>
                                                <View style={styles.clientChipsRow}>
                                                    <View
                                                        style={[
                                                            styles.miniChip,
                                                            { backgroundColor: cfg.bg },
                                                        ]}
                                                    >
                                                        <Text style={[styles.miniChipText, { color: cfg.color }]}>
                                                            {cfg.label}
                                                        </Text>
                                                    </View>
                                                    {zone && (
                                                        <View
                                                            style={[
                                                                styles.miniChip,
                                                                { backgroundColor: zone.bgLight },
                                                            ]}
                                                        >
                                                            <View
                                                                style={[
                                                                    styles.zoneDotMini,
                                                                    { backgroundColor: zone.color },
                                                                ]}
                                                            />
                                                            <Text
                                                                style={[styles.miniChipText, { color: zone.color }]}
                                                            >
                                                                {zone.name}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={styles.clientAddressRow}>
                                                    <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                                                    <Text style={styles.clientAddress} numberOfLines={1}>
                                                        {item.client_location?.direction}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                ) : showRoutes && !showRoute && !isTimerRunning ? (
                    <View style={[styles.cardsWrapper, { bottom: insets.bottom + 20 }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={
                                listRoute?.length === 0 ? styles.emptyScrollContainer : styles.cardsContainer
                            }
                            decelerationRate="fast"
                            snapToInterval={width * 0.78 + 12}
                            snapToAlignment="start"
                        >
                            {listRoute && listRoute.length > 0 ? (
                                listRoute.map((item, index) => {
                                    const progress = item.progress || 0;
                                    const progressColor =
                                        progress >= 100
                                            ? COLORS.success
                                            : progress >= 50
                                            ? COLORS.warning
                                            : COLORS.brand;
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
                                                        {"  "}{formatDate(item.startDate)}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={[
                                                        styles.progressPill,
                                                        { backgroundColor: `${progressColor}1A` },
                                                    ]}
                                                >
                                                    <Text style={[styles.progressPillText, { color: progressColor }]}>
                                                        {progress}%
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.progressTrack}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        {
                                                            width: `${Math.min(progress, 100)}%`,
                                                            backgroundColor: progressColor,
                                                        },
                                                    ]}
                                                />
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
                                    <Text style={styles.emptyCardSubtitle}>
                                        No hay rutas disponibles para hoy
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                ) : (
                    showRoute &&
                    consolidatedStops.length > 0 &&
                    !isTimerRunning && (
                        <View style={[styles.cardsWrapper, { bottom: insets.bottom + 20 }]}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.cardsContainer}
                                decelerationRate="fast"
                                snapToInterval={width * 0.78 + 12}
                                snapToAlignment="start"
                            >
                                {consolidatedStops.map((stop, index) => {
                                    const status = getDeliveryStatusStyle(stop.visitStatus1);
                                    const hasMultiple = stop.orders.length > 1;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.stopCard}
                                            onPress={() => centerMapOnStop(stop)}
                                            activeOpacity={0.9}
                                        >
                                            <View style={styles.stopHeader}>
                                                <View style={styles.stopNumberBadge}>
                                                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                                                </View>
                                                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                                                    <Ionicons name={status.icon} size={10} color={status.color} />
                                                    <Text style={[styles.statusPillText, { color: status.color }]}>
                                                        {status.label}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.stopName} numberOfLines={1}>
                                                {stop.name} {stop.lastName}
                                            </Text>
                                            <View style={styles.stopAddressRow}>
                                                <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                                                <Text style={styles.stopAddress} numberOfLines={2}>
                                                    {stop.client_location?.direction}
                                                </Text>
                                            </View>
                                            <View style={styles.stopFooter}>
                                                {hasMultiple && (
                                                    <View style={styles.stopMultiBadge}>
                                                        <Ionicons name="layers" size={9} color="#fff" />
                                                        <Text style={styles.stopMultiBadgeText}>
                                                            {stop.orders.length} pedidos
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={styles.stopBoxesBadge}>
                                                    <Ionicons name="cube" size={9} color={COLORS.brand} />
                                                    <Text style={styles.stopBoxesBadgeText}>
                                                        {stop.totalBoxes}
                                                    </Text>
                                                </View>
                                                <Text style={styles.stopTotal}>
                                                    Bs. {stop.totalAmount.toFixed(2)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )
                )}

                {/* BOTTOM SHEET */}
                {modality && selectedStop && (
                    <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={styles.modalHandle} />

                        <ScrollView
                            style={{ maxHeight: height * 0.7 }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
                            <View style={styles.bottomSheetHeader}>
                                <View style={styles.bottomSheetAvatar}>
                                    {selectedStop.identificationImage ? (
                                        <Image
                                            source={{ uri: selectedStop.identificationImage }}
                                            style={styles.bottomSheetAvatarImg}
                                        />
                                    ) : (
                                        <Text style={styles.bottomSheetAvatarText}>
                                            {(selectedStop.name || "?")[0]?.toUpperCase()}
                                            {selectedStop.lastName?.[0]?.toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.bottomSheetName} numberOfLines={1}>
                                        {selectedStop.client_location?.sucursalName ||
                                            `${selectedStop.name} ${selectedStop.lastName}`}
                                    </Text>
                                    {selectedStop.client_location?.direction && (
                                        <View style={styles.bottomSheetAddressRow}>
                                            <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                                            <Text style={styles.bottomSheetAddress} numberOfLines={1}>
                                                {selectedStop.client_location.direction}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.bottomSheetChipsRow}>
                                        {selectedStop.userCategory && (() => {
                                            const cfg = getCategoryConfig(selectedStop.userCategory);
                                            return (
                                                <View
                                                    style={[
                                                        styles.bottomSheetMultiBadge,
                                                        { backgroundColor: cfg.bg },
                                                    ]}
                                                >
                                                    <Ionicons name={cfg.icon} size={10} color={cfg.color} />
                                                    <Text
                                                        style={[styles.bottomSheetMultiText, { color: cfg.color }]}
                                                    >
                                                        {cfg.label}
                                                    </Text>
                                                </View>
                                            );
                                        })()}
                                        {selectedStop.orders && selectedStop.orders.length > 1 && (
                                            <View style={styles.bottomSheetMultiBadge}>
                                                <Ionicons name="layers" size={10} color={COLORS.brand} />
                                                <Text style={styles.bottomSheetMultiText}>
                                                    {selectedStop.orders.length} pedidos
                                                </Text>
                                            </View>
                                        )}
                                    </View>
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
                                            <Text style={styles.tripInfoValue}>
                                                {durationInTraffic || "—"}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {selectedStop.orders && selectedStop.orders.length > 0 ? (
                                <OrderDetailsCardScreen stop={selectedStop} />
                            ) : (
                                <View style={styles.clientInfoPanel}>
                                    <Text style={styles.clientInfoLabel}>INFORMACIÓN DEL CLIENTE</Text>
                                    {selectedStop.number && (
                                        <View style={styles.clientInfoRow}>
                                            <Ionicons name="call" size={12} color={COLORS.textMid} />
                                            <Text style={styles.clientInfoText}>{selectedStop.number}</Text>
                                        </View>
                                    )}
                                    {selectedStop.email && (
                                        <View style={styles.clientInfoRow}>
                                            <Ionicons name="mail" size={12} color={COLORS.textMid} />
                                            <Text style={styles.clientInfoText}>{selectedStop.email}</Text>
                                        </View>
                                    )}
                                    {selectedStop.identityNumber && (
                                        <View style={styles.clientInfoRow}>
                                            <Ionicons name="card" size={12} color={COLORS.textMid} />
                                            <Text style={styles.clientInfoText}>
                                                CI: {selectedStop.identityNumber}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.noOrdersInfo}>
                                        <Ionicons name="information-circle" size={14} color={COLORS.info} />
                                        <Text style={styles.noOrdersText}>
                                            Este cliente no tiene pedidos pendientes para esta ruta.
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {deliveryRegistered && isTimerRunning && (
                                <View style={styles.registeredBanner}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                    <Text style={styles.registeredBannerText}>
                                        Entrega registrada · Falta finalizar el trayecto
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.bottomSheetActions}>
                            {!isTimerRunning && !isAlreadyDelivered && selectedStop.orders && selectedStop.orders.length > 0 && (
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => handleStartTrip(selectedStop)}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="navigate" size={16} color="#fff" />
                                    <Text style={styles.primaryButtonText}>Iniciar trayecto</Text>
                                </TouchableOpacity>
                            )}

                            {!isTimerRunning && isAlreadyDelivered && (
                                <View style={styles.deliveredChip}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                    <Text style={styles.deliveredChipText}>Esta parada ya fue entregada</Text>
                                </View>
                            )}

                            {isTimerRunning && !deliveryRegistered && (
                                <TouchableOpacity
                                    style={styles.brandButton}
                                    onPress={() => handleOpenDeliveryForm(selectedStop)}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="cube" size={16} color="#fff" />
                                    <Text style={styles.primaryButtonText}>Registrar entrega</Text>
                                </TouchableOpacity>
                            )}

                            {isTimerRunning && deliveryRegistered && (
                                <TouchableOpacity
                                    style={styles.successButton}
                                    onPress={() => handleFinishTrip(selectedStop)}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="flag" size={16} color="#fff" />
                                    <Text style={styles.primaryButtonText}>Finalizar trayecto</Text>
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

                <StackingPlanSheet
                    visible={showStackingPlan}
                    onClose={() => setShowStackingPlan(false)}
                    route={route}
                    tripColor={COLORS.brand}
                />
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

    loadingPlanBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.brand,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 12,
        shadowColor: COLORS.brand,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 4,
    },
    loadingPlanIcon: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.25)",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingPlanBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "800",
        lineHeight: 14,
    },
    loadingPlanBtnSubtext: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 9,
        fontWeight: "700",
        marginTop: 1,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },

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

    zoneChipsWrap: { marginTop: 8 },
    zoneChipsContent: { paddingHorizontal: 16, gap: 6, paddingVertical: 2 },
    zoneChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#fff",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    zoneDot: { width: 8, height: 8, borderRadius: 4 },
    zoneChipText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
    zoneChipBadge: {
        backgroundColor: COLORS.borderLight,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        minWidth: 22,
        alignItems: "center",
    },
    zoneChipBadgeText: { fontSize: 10, fontWeight: "800", color: COLORS.textMid },
    togglePolyChip: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: COLORS.dangerBg,
        borderWidth: 1,
        borderColor: COLORS.brand,
        justifyContent: "center",
        alignItems: "center",
    },

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
    multiOrderBadge: {
        position: "absolute",
        top: -4,
        right: -8,
        backgroundColor: COLORS.warning,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 3,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#fff",
    },
    multiOrderBadgeText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "900",
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
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    clientAvatarImg: { width: "100%", height: "100%" },
    clientInfo: { flex: 1 },
    clientName: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
    clientChipsRow: { flexDirection: "row", gap: 4, marginBottom: 4, flexWrap: "wrap" },
    miniChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
    },
    miniChipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
    zoneDotMini: { width: 5, height: 5, borderRadius: 2.5 },
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
    stopAddressRow: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginBottom: 8 },
    stopAddress: {
        flex: 1,
        fontSize: 11,
        color: COLORS.textMid,
        fontWeight: "500",
        lineHeight: 15,
    },
    stopFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    stopMultiBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: COLORS.warning,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    stopMultiBadgeText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
    stopBoxesBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: COLORS.dangerBg,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    stopBoxesBadgeText: {
        color: COLORS.brand,
        fontSize: 10,
        fontWeight: "800",
    },
    stopTotal: {
        marginLeft: "auto",
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.text,
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
        maxHeight: height * 0.88,
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
    bottomSheetChipsRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
    bottomSheetMultiBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: COLORS.dangerBg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    bottomSheetMultiText: {
        fontSize: 10,
        fontWeight: "800",
        color: COLORS.brand,
        letterSpacing: 0.3,
    },
    bottomSheetClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.borderLight,
        justifyContent: "center",
        alignItems: "center",
    },

    clientInfoPanel: {
        backgroundColor: COLORS.bg,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
    },
    clientInfoLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: COLORS.textMid,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 10,
    },
    clientInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 6,
    },
    clientInfoText: { fontSize: 12, color: COLORS.text, fontWeight: "600" },
    noOrdersInfo: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: COLORS.infoBg,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
    },
    noOrdersText: {
        flex: 1,
        fontSize: 11,
        color: COLORS.info,
        fontWeight: "600",
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

    registeredBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.successBg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    registeredBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.success,
        lineHeight: 16,
    },

    bottomSheetActions: { gap: 8, paddingTop: 8 },
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

    deliveredChip: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.successBg,
        paddingVertical: 14,
        borderRadius: 14,
    },
    deliveredChipText: {
        color: COLORS.success,
        fontSize: 13,
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

export default MapScreenDelivery;