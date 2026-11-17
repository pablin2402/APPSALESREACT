import React, { useEffect, useState, useRef, useContext, useMemo } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image, TextInput,
    ActivityIndicator, Dimensions, StatusBar,
    Animated, Easing, StyleSheet
} from "react-native";
import MapView, { Marker, Polygon, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import axios from "axios";
import { API_URL, GOOGLE_API_KEY } from "../config";
import { INITIAL_ADDRESS, MAP_STYLE } from "../utils/MapUtils";

import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";

import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ClientMarker from "../components/ClientMarker";

import { TimerContext } from "./TimerContext";
import { AuthContext } from "../AuthContext";

import StackingPlanSheet from "../utils/Stackingplansheet";
import OrderDetailsCardScreen from "../screen/OrderDetailsCardScreen";
import {
    calculateRouteSummary,
    consolidateOrdersByClient,
} from "../utils/Routeoptimizermobile";
import { ShimmerBlock, SkeletonHeader, SkeletonStopCard } from "../utils/MapSkeleton";

import {
    MUNICIPIOS_COCHABAMBA,
    inferZoneFromClient,
    getCategoryConfig,
} from "../utils/MunicipiosCochabamba";
import { COLORS, styles } from "../styles/MapScreenDeliveryStyle";
const { width, height } = Dimensions.get("window");

const STORAGE_KEYS = {
    routeId: "mapdelivery_route_id",
    activeDest: "mapdelivery_active_dest",
    selectedClientLocId: "mapdelivery_selected_loc_id",
    orderId: "mapdelivery_order_id",
    isTimerRunning: "mapdelivery_timer_running",
    deliveryRegistered: "mapdelivery_delivery_registered",
    startTimestamp: "mapdelivery_start_ts",
};
const ALL_ZONES_KEY = "__ALL__";
const GEOFENCE_RADIUS_METERS = 40;
const isValidCoord = (lat, lng) =>
    typeof lat === "number" && typeof lng === "number" &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


const formatDistance = (m) => {
    if (m == null || m === Infinity) return "—";
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
};

const MemoClientMarker = React.memo(ClientMarker, (prev, next) => {
    return prev.client._id === next.client._id;
});
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

    const [selectedZone, setSelectedZone] = useState(ALL_ZONES_KEY);
    const [showPolygons, setShowPolygons] = useState(true);
    const [showCards, setShowCards] = useState(true);
    const [mapRegion, setMapRegion] = useState(null);
    const [topPanelHeight, setTopPanelHeight] = useState(0);
    const [sheetCollapsed, setSheetCollapsed] = useState(false);
    const routeSummary = useMemo(
        () => calculateRouteSummary(route),
        [route]
    );

    const consolidatedStops = useMemo(
        () => (routeSummary?.consolidatedStops || []).filter((s) =>
            isValidCoord(
                parseFloat(s.client_location?.latitud),
                parseFloat(s.client_location?.longitud)
            )
        ),
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
        } catch (e) { }
    };
    const visibleClients = useMemo(() => {
        if (!mapRegion) return filteredClients.slice(0, 60);
        const latDelta = mapRegion.latitudeDelta;
        if (latDelta > 0.15) return filteredClients.slice(0, 30);
        if (latDelta > 0.05) return filteredClients.slice(0, 80);
        return filteredClients;
    }, [filteredClients, mapRegion]);
    const clearActiveTrip = async () => {
        try {
            await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
        } catch (e) { }
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
        } catch (error) { }
    };

    const getRoutesById = async (value) => {
        try {
            const response = await axios.post(
                API_URL + "/whatsapp/delivery/list/route/id",
                { _id: value, id_owner: idOwner },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRoute(response.data);
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
        } catch (error) { }
    };

    const uploadProgressRoute = async () => {
        try {
            await axios.put(
                API_URL + "/whatsapp/route/delivery/progress/id",
                { id_owner: idOwner, _id: routeId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) { }
    };

    async function getUserLocation() {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return null;

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 10000,
            }).catch(async () => {
                return await Location.getLastKnownPositionAsync();
            });

            if (!location) return null;

            const current = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            setOrigin((prevOrigin) => {
                if (
                    prevOrigin.latitude !== current.latitude ||
                    prevOrigin.longitude !== current.longitude
                ) {
                    return current;
                }
                return prevOrigin;
            });
            return current;
        } catch (e) {
            return null;
        }
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
        try {
            const destLat = parseFloat(stop?.client_location?.latitud);
            const destLng = parseFloat(stop?.client_location?.longitud);

            if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) {
                alert("Este cliente no tiene ubicación válida");
                return;
            }

            const userLocation = await getUserLocation();
            if (!userLocation) return;

            const etaResult = await fetchETA(userLocation, {
                latitude: destLat,
                longitude: destLng,
            });

            const distanceFinal = etaResult?.distance || "";
            const durationFinal = etaResult?.durationInTraffic || "";

            const startTime = await startTimer();
            startMapping();

            const newDest = { latitude: destLat, longitude: destLng, clientId: stop.client_location._id };
            setActiveDestination(newDest);

            const firstOrder = stop.orders?.[0] || stop;

            await persistActiveTrip({
                rid: routeId,
                dest: newDest,
                locId: stop.client_location._id,
                oId: firstOrder._id,
            });

            const orders = stop.orders?.length > 0 ? stop.orders : [stop];
            for (const order of orders) {
                await uploadRoute(
                    order,
                    startTime, null, null,
                    durationFinal, distanceFinal,
                    "está en camino al destino",
                    "En camino", false
                );
            }

            setIsTimerRunning(true);
            setDeliveryRegistered(false);
            await AsyncStorage.removeItem(STORAGE_KEYS.deliveryRegistered);

            if (mapRef.current && Number.isFinite(userLocation.latitude)) {
                mapRef.current.fitToCoordinates(
                    [userLocation, { latitude: destLat, longitude: destLng }],
                    { edgePadding: { top: 180, right: 80, bottom: 320, left: 80 }, animated: true }
                );
            }
        } catch (e) {
            alert("No se pudo iniciar el trayecto");
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
    const cancelTrip = async () => {
        setIsTimerRunning(false);
        setTimer(0);
        setActiveDestination(null);
        setDeliveryRegistered(false);
        setSelectedStop(null);
        setModal(false);
        setDistance("");
        setDuration("");
        setDurationInTraffic("");
        setArrivalTime("");
        setTrafficLevel("normal");
        await stopTimer();
        await clearActiveTrip();
        await AsyncStorage.removeItem("timer_start");
    };

    const showRoutesList = () => {
        setShowRoutes(true);
        setShowClients(false);
        setShowRoute(false);
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
                        } catch (e) { }
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
            } catch (e) { }
        };
        init();
    }, []);
    useFocusEffect(
        React.useCallback(() => {
            const checkRegisteredFlag = async () => {
                try {
                    const flag = await AsyncStorage.getItem(STORAGE_KEYS.deliveryRegistered);
                    if (flag === "true") {
                        setDeliveryRegistered(true);
                        if (routeId) await getRoutesById(routeId);
                    }
                } catch (e) { }
            };
            checkRegisteredFlag();
        }, [routeId])
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
        const lat = Number(client.client_location?.latitud);
        const lng = Number(client.client_location?.longitud);
        if (!isValidCoord(lat, lng)) return;
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
        setSheetCollapsed(false);
        mapRef.current?.animateToRegion(
            {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
            },
            800
        );
    };

    const centerMapOnStop = (stop) => {
        const lat = parseFloat(stop.client_location?.latitud);
        const lng = parseFloat(stop.client_location?.longitud);
        if (!isValidCoord(lat, lng)) return;
        setSelectedStop(stop);
        const firstOrder = stop.orders?.[0] || stop;
        setOrderId(firstOrder._id);
        setModal(true);
        setSheetCollapsed(false);

        mapRef.current?.animateToRegion(
            {
                latitude: lat,
                longitude: lng,
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
    const distanceToStop =
        selectedStop?.client_location && origin.latitude !== 0
            ? haversineDistance(
                origin.latitude,
                origin.longitude,
                parseFloat(selectedStop.client_location.latitud),
                parseFloat(selectedStop.client_location.longitud)
            )
            : null;

    const withinGeofence = distanceToStop !== null && distanceToStop <= GEOFENCE_RADIUS_METERS;
    const sheetMaxHeight = height - topPanelHeight - 40;
    const hasStackingPlan = showRoute && route?.[0] && routeSummary?.totalBoxes > 0;
    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
                <SafeAreaView edges={["top"]} style={styles.topSafe}>
                    <View style={styles.topHeader}>
                        <SkeletonHeader />
                    </View>
                    <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <ShimmerBlock height={46} radius={14} style={{ flex: 1 }} />
                        </View>
                    </View>
                </SafeAreaView>
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: 20 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 }}>
                        <ShimmerBlock width={120} height={16} radius={5} />
                        <ShimmerBlock width={40} height={20} radius={999} />
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                        scrollEnabled={false}
                    >
                        <SkeletonStopCard />
                        <SkeletonStopCard />
                        <SkeletonStopCard />
                    </ScrollView>
                </View>
            </View>
        );
    }
    return (
        <SafeAreaProvider>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={styles.container}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    //customMapStyle={MAP_STYLE}
                    // provider={PROVIDER_GOOGLE}
                    initialRegion={INITIAL_ADDRESS}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    onRegionChangeComplete={(region) => setMapRegion(region)}
                >
                    {origin.latitude !== 0 && (
                        <Circle
                            center={{ latitude: origin.latitude, longitude: origin.longitude }}
                            radius={GEOFENCE_RADIUS_METERS}
                            strokeColor={COLORS.brand}
                            strokeWidth={3}
                            fillColor="rgba(211,66,62,0.18)"
                        />
                    )}
                    {showClients && !showRoute && showPolygons &&
                        Object.entries(MUNICIPIOS_COCHABAMBA).map(([key, m]) => {

                            const validPaths = (m.paths || []).filter((p) => isValidCoord(p.lat, p.lng));
                            if (validPaths.length < 3) return null;
                            const isSelected = selectedZone === key;
                            const isFiltered =
                                selectedZone !== ALL_ZONES_KEY && !isSelected;

                            return (
                                <Polygon
                                    key={key}
                                    coordinates={validPaths.map(p => ({ latitude: p.lat, longitude: p.lng }))}
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
                        filteredClients
                            .filter((c) => isValidCoord(
                                parseFloat(c.client_location?.latitud),
                                parseFloat(c.client_location?.longitud)
                            ))
                            .map((client, index) => (
                                <ClientMarker key={index} client={client} />
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
                                    {!isTimerRunning &&
                                        index === 0 &&
                                        consolidatedStops.length > 1 &&
                                        isValidCoord(origin.latitude, origin.longitude) && (
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
                                                waypoints={consolidatedStops.slice(0, -1).slice(0, 23).map((s) => ({
                                                    latitude: parseFloat(s.client_location.latitud),
                                                    longitude: parseFloat(s.client_location.longitud),
                                                }))}
                                                optimizeWaypoints={true}
                                                apikey={GOOGLE_API_KEY}
                                                strokeColor="#000000"
                                                strokeWidth={2}
                                                resetOnChange={false}
                                                onError={() => { }}
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
                            onError={() => { }}
                            resetOnChange={false}

                        />
                    )}
                </MapView>

                <SafeAreaView
                    edges={["top"]}
                    style={styles.topSafe}
                    onLayout={(e) => setTopPanelHeight(e.nativeEvent.layout.height)}
                >
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

                {showClients && !showRoute && !showRoutes && !isTimerRunning && !modality && showCards ? (
                    <View style={styles.cardsWrapper}>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cardsContainer}
                            decelerationRate="fast"
                            snapToInterval={236}
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
                                            style={styles.deliveryCard}
                                            onPress={() => openClientSheet(item)}
                                            activeOpacity={0.85}
                                        >
                                            <View style={styles.deliveryImageWrapper}>
                                                {item.identificationImage ? (
                                                    <>
                                                        <Image
                                                            source={{ uri: item.identificationImage }}
                                                            style={styles.deliveryImage}
                                                        />
                                                        <View style={styles.imageBadge}>
                                                            <View style={styles.imageBadgeDot} />
                                                            <Text style={styles.imageBadgeText}>Activo</Text>
                                                        </View>
                                                    </>
                                                ) : (
                                                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: cfg.bg }}>
                                                        <Ionicons name={cfg.icon} size={28} color={cfg.color} />
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.deliveryInfo}>
                                                <Text style={styles.deliveryName} numberOfLines={1}>
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
                                                <View style={styles.locationRow}>
                                                    <Ionicons name="location-sharp" size={12} color={COLORS.brand} />
                                                    <Text style={styles.deliveryAddress} numberOfLines={1}>
                                                        {item.client_location?.direction}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardDivider} />
                                                <View style={styles.cardFooter}>
                                                    <View style={styles.metaChip}>
                                                        <Ionicons name="time-outline" size={10} color={COLORS.textMid} />
                                                        <Text style={styles.metaChipText}>Disponible</Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={16} color={COLORS.brand} />
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                ) : showRoutes && !showRoute && !isTimerRunning && !modality && showCards ? (
                    <View style={styles.cardsWrapper}>
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
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                        <Ionicons name="calendar-outline" size={10} color={COLORS.textMid} />
                                                        <Text style={styles.routeCardDate}>
                                                            {formatDate(item.startDate)}
                                                        </Text>
                                                    </View>
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
                    !isTimerRunning && !modality && showCards && (
                        <View style={styles.cardsWrapper}>
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
                                            style={styles.deliveryCard}
                                            onPress={() => centerMapOnStop(stop)}
                                            activeOpacity={0.85}
                                        >
                                            <View style={styles.deliveryImageWrapper}>
                                                {stop.profilePicture ? (
                                                    <Image
                                                        source={{ uri: stop.profilePicture }}
                                                        style={styles.deliveryImage}
                                                    />
                                                ) : (
                                                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.dangerBg }}>
                                                        <Ionicons name="person" size={28} color={COLORS.brand} />
                                                    </View>
                                                )}
                                                <View style={styles.stopNumberBadge}>
                                                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                                                </View>
                                                <View style={[styles.imageBadge, { backgroundColor: status.bg }]}>
                                                    <Ionicons name={status.icon} size={10} color={status.color} />
                                                    <Text style={[styles.imageBadgeText, { color: status.color }]}>
                                                        {status.label}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.deliveryInfo}>
                                                <Text style={styles.deliveryName} numberOfLines={1}>
                                                    {stop.client_location?.sucursalName || `${stop.name} ${stop.lastName}`}
                                                </Text>
                                                <View style={styles.locationRow}>
                                                    <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                                                    <Text style={styles.deliveryAddress} numberOfLines={1}>
                                                        {stop.client_location?.direction}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardDivider} />
                                                <View style={styles.cardFooter}>
                                                    <View style={styles.stopBoxesBadge}>
                                                        <Ionicons name="cube" size={9} color={COLORS.brand} />
                                                        <Text style={styles.stopBoxesBadgeText}>{stop.totalBoxes} cajas</Text>
                                                    </View>
                                                    {hasMultiple && (
                                                        <View style={styles.stopMultiBadge}>
                                                            <Ionicons name="layers" size={9} color="#fff" />
                                                            <Text style={styles.stopMultiBadgeText}>{stop.orders.length}</Text>
                                                        </View>
                                                    )}
                                                    <Text style={styles.stopTotal}>Bs. {stop.totalAmount.toFixed(0)}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )
                )}

                {modality && selectedStop && sheetCollapsed && (
                    <TouchableOpacity
                        style={{
                            position: "absolute",
                            left: 16,
                            right: 16,
                            bottom: insets.bottom + 12,
                            backgroundColor: "#fff",
                            borderRadius: 20,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            shadowColor: "#000",
                            shadowOpacity: 0.2,
                            shadowOffset: { width: 0, height: -4 },
                            shadowRadius: 14,
                            elevation: 12,
                            zIndex: 20,
                        }}
                        onPress={() => setSheetCollapsed(false)}
                        activeOpacity={0.9}
                    >
                        <View style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            backgroundColor: COLORS.dangerBg,
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <Ionicons name="cube" size={18} color={COLORS.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.text }} numberOfLines={1}>
                                {selectedStop.client_location?.sucursalName ||
                                    `${selectedStop.name} ${selectedStop.lastName}`}
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: COLORS.textMid, marginTop: 2 }}>
                                {selectedStop.orders?.length || 0} pedidos · Bs. {Number(selectedStop.totalAmount || 0).toFixed(0)}
                            </Text>
                        </View>
                        <Ionicons name="chevron-up" size={20} color={COLORS.brand} />
                    </TouchableOpacity>
                )}

                {modality && selectedStop && !sheetCollapsed && (
                    <View style={[
                        styles.bottomSheet,
                        {
                            paddingBottom: insets.bottom + 16,
                            top: topPanelHeight + 12,
                            left: 16,
                            right: 16,
                            bottom: insets.bottom + 12,
                            borderRadius: 28,
                            overflow: "hidden",
                        }
                    ]}>
                        <View style={styles.modalHandle} />

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
                                onPress={() => setSheetCollapsed(true)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-down" size={18} color={COLORS.textMid} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={{ flex: 1 }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
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

                            {selectedStop.orders && selectedStop.orders.length > 0 && (
                            <View style={{
                                backgroundColor: COLORS.bg,
                                borderRadius: 14,
                                padding: 12,
                                marginBottom: 8,
                                borderWidth: 1,
                                borderColor: COLORS.borderLight,
                            }}>
                                <Text style={{
                                    fontSize: 10,
                                    fontWeight: "800",
                                    color: COLORS.textMid,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.4,
                                    marginBottom: 8,
                                }}>Pedidos a entregar</Text>

                                <ScrollView
                                    style={{ maxHeight: 180 }}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                >
                                    {selectedStop.orders.map((order, i) => (
                                        <View key={i} style={{
                                            marginBottom: i < selectedStop.orders.length - 1 ? 10 : 0,
                                            backgroundColor: "#fff",
                                            borderRadius: 12,
                                            padding: 10,
                                            borderWidth: 1,
                                            borderColor: COLORS.border,
                                        }}>
                                            <View style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                marginBottom: 8,
                                            }}>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                    <View style={{
                                                        width: 28, height: 28, borderRadius: 8,
                                                        backgroundColor: COLORS.dangerBg,
                                                        justifyContent: "center", alignItems: "center",
                                                    }}>
                                                        <Ionicons name="receipt-outline" size={13} color={COLORS.brand} />
                                                    </View>
                                                    <Text style={{ fontSize: 12, fontWeight: "800", color: COLORS.text }}>
                                                        Nota #{order.receiveNumber}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 13, fontWeight: "800", color: COLORS.brand }}>
                                                    Bs. {Number(order.totalAmount || 0).toFixed(0)}
                                                </Text>
                                            </View>

                                            {order.products && order.products.length > 0 && (
                                                <View style={{
                                                    backgroundColor: COLORS.bg,
                                                    borderRadius: 8,
                                                    padding: 8,
                                                    gap: 4,
                                                }}>
                                                    {order.products.map((prod, pi) => (
                                                        <View key={pi} style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                        }}>
                                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                                                                <View style={{
                                                                    width: 20, height: 20, borderRadius: 5,
                                                                    backgroundColor: COLORS.brand,
                                                                    justifyContent: "center", alignItems: "center",
                                                                }}>
                                                                    <Text style={{ fontSize: 9, fontWeight: "800", color: COLORS.card }}>
                                                                        {prod.cantidad || 1}
                                                                    </Text>
                                                                </View>
                                                                <Text style={{ fontSize: 11, color: COLORS.text, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                                                                    {prod.nombre || "Producto"}
                                                                </Text>
                                                            </View>
                                                            <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.text }}>
                                                                Bs. {Number((prod.precio || 0) * (prod.cantidad || 1)).toFixed(0)}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </ScrollView>

                                <View style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: 10,
                                    paddingTop: 8,
                                    borderTopWidth: 1,
                                    borderTopColor: COLORS.border,
                                }}>
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textMid }}>
                                        Total · {selectedStop.totalBoxes} cajas
                                    </Text>
                                    <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.brand }}>
                                        Bs. {Number(selectedStop.totalAmount || 0).toFixed(0)}
                                    </Text>
                                </View>
                            </View>
                            )}
                        </ScrollView>
                        <View style={[styles.bottomSheetActions, { flexShrink: 0 }]}>
                            {selectedStop.orders && selectedStop.orders.length > 0 && (
                                <>
                                    {!isTimerRunning && !isAlreadyDelivered && (
                                        <TouchableOpacity
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 10,
                                                paddingVertical: 15,
                                                borderRadius: 14,
                                                backgroundColor: COLORS.brand,
                                                shadowColor: COLORS.brand,
                                                shadowOpacity: 0.35,
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowRadius: 10,
                                                elevation: 5,
                                            }}
                                            onPress={() => handleStartTrip(selectedStop)}
                                            activeOpacity={0.9}
                                        >
                                            <View style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 10,
                                                backgroundColor: "rgba(255,255,255,0.2)",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}>
                                                <Ionicons name="navigate" size={16} color="#fff" />
                                            </View>
                                            <View>
                                                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 0.3 }}>
                                                    Iniciar trayecto
                                                </Text>
                                                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600" }}>
                                                    {selectedStop.client_location?.sucursalName || selectedStop.name}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}

                            {!isTimerRunning && isAlreadyDelivered && (
                                <View style={styles.deliveredChip}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                    <Text style={styles.deliveredChipText}>Pedido entregado</Text>
                                </View>
                            )}

                            {isTimerRunning && !deliveryRegistered && (
                                <>
                                    {!withinGeofence && (
                                        <View style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 6,
                                            backgroundColor: COLORS.warningBg,
                                            paddingHorizontal: 12,
                                            paddingVertical: 10,
                                            borderRadius: 12,
                                            marginBottom: 8,
                                        }}>
                                            <Ionicons name="warning" size={14} color={COLORS.warning} />
                                            <Text style={{ flex: 1, fontSize: 11, fontWeight: "700", color: COLORS.warning }}>
                                                Acércate a menos de {GEOFENCE_RADIUS_METERS}m · estás a {formatDistance(distanceToStop)}
                                            </Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 10,
                                            paddingVertical: 15,
                                            borderRadius: 14,
                                            backgroundColor: withinGeofence ? COLORS.info : COLORS.textLight,
                                            shadowColor: COLORS.info,
                                            shadowOpacity: withinGeofence ? 0.35 : 0,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowRadius: 10,
                                            elevation: withinGeofence ? 5 : 0,
                                        }}
                                        onPress={() => handleOpenDeliveryForm(selectedStop)}
                                        disabled={!withinGeofence}
                                        activeOpacity={0.9}
                                    >
                                        <View style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 10,
                                            backgroundColor: "rgba(255,255,255,0.2)",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}>
                                            <Ionicons name={withinGeofence ? "cube" : "lock-closed"} size={16} color="#fff" />
                                        </View>
                                        <View>
                                            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 0.3 }}>
                                                {withinGeofence ? "Registrar entrega" : "Fuera de rango"}
                                            </Text>
                                            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600" }}>
                                                {withinGeofence ? "Confirmar los pedidos entregados" : "Debes estar en el punto de entrega"}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}

                            {isTimerRunning && deliveryRegistered && (
                                <TouchableOpacity
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 10,
                                        paddingVertical: 15,
                                        borderRadius: 14,
                                        backgroundColor: COLORS.success,
                                        shadowColor: COLORS.success,
                                        shadowOpacity: 0.35,
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowRadius: 10,
                                        elevation: 5,
                                    }}
                                    onPress={() => handleFinishTrip(selectedStop)}
                                    activeOpacity={0.9}
                                >
                                    <View style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: 10,
                                        backgroundColor: "rgba(255,255,255,0.2)",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}>
                                        <Ionicons name="flag" size={16} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 0.3 }}>
                                            Finalizar trayecto
                                        </Text>
                                        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600" }}>
                                            Marcar parada como completada
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {isTimerRunning && (
                                <TouchableOpacity
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        paddingVertical: 13,
                                        borderRadius: 14,
                                        backgroundColor: "#fff",
                                        borderWidth: 1.5,
                                        borderColor: COLORS.brand,
                                        marginTop: 8,
                                    }}
                                    onPress={cancelTrip}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="close-circle" size={16} color={COLORS.brand} />
                                    <Text style={{ color: COLORS.brand, fontSize: 13, fontWeight: "800", letterSpacing: 0.3 }}>
                                        Cancelar entrega
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                {!modality && !isTimerRunning && (
                    <TouchableOpacity
                        style={{
                            position: "absolute",
                            bottom: showCards ? 220 : 20,
                            right: 16,
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: "#fff",
                            justifyContent: "center",
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOpacity: 0.15,
                            shadowOffset: { width: 0, height: 4 },
                            shadowRadius: 8,
                            elevation: 6,
                            zIndex: 6,
                            borderWidth: 1,
                            borderColor: COLORS.borderLight,
                        }}
                        onPress={() => setShowCards(!showCards)}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name={showCards ? "chevron-down" : "chevron-up"}
                            size={18}
                            color={COLORS.text}
                        />
                    </TouchableOpacity>
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
export default MapScreenDelivery;