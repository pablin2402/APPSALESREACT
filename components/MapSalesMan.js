import React, { useEffect, useState, useRef, useContext } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Animated,
  Easing,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL, GOOGLE_API_KEY } from "../config";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ClientMarker from "../components/ClientMarker";
import { TimerContext } from "../components/TimerContext";
import { AuthContext } from "../AuthContext";

const { height } = Dimensions.get("window");

const GEOFENCE_RADIUS_METERS = 300;
const VISIT_DURATION_MIN = 15;
const VISIT_DURATION_MAX = 30;
const CAR_AVG_KMH = 35;
const TRANSIT_AVG_KMH = 18;

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
  danger: "#D3423E",
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

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const optimizeRouteFromOrigin = (originLat, originLng, stops) => {
  if (!stops || stops.length === 0) return [];
  const unvisited = [...stops];
  const ordered = [];
  let currentLat = originLat;
  let currentLng = originLng;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const stop = unvisited[i];
      const lat = parseFloat(stop.client_location?.latitud);
      const lng = parseFloat(stop.client_location?.longitud);
      if (!lat || !lng) continue;
      const d = haversineDistance(currentLat, currentLng, lat, lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = unvisited.splice(nearestIdx, 1)[0];
    const nextLat = parseFloat(next.client_location?.latitud);
    const nextLng = parseFloat(next.client_location?.longitud);
    ordered.push({ ...next, _distanceFromPrev: nearestDist });
    currentLat = nextLat;
    currentLng = nextLng;
  }
  return ordered;
};

const estimateRouteTotals = (orderedStops) => {
  let totalDistanceM = 0;
  for (const stop of orderedStops) {
    if (stop._distanceFromPrev && stop._distanceFromPrev !== Infinity) {
      totalDistanceM += stop._distanceFromPrev;
    }
  }
  const totalDistanceKm = totalDistanceM / 1000;
  const visitMinutesMin = orderedStops.length * VISIT_DURATION_MIN;
  const visitMinutesMax = orderedStops.length * VISIT_DURATION_MAX;
  const carTravelMinutes = (totalDistanceKm / CAR_AVG_KMH) * 60;
  const transitTravelMinutes = (totalDistanceKm / TRANSIT_AVG_KMH) * 60;
  return {
    totalDistanceKm,
    visitMinutesMin,
    visitMinutesMax,
    carTotalMin: Math.round(carTravelMinutes + visitMinutesMin),
    carTotalMax: Math.round(carTravelMinutes + visitMinutesMax),
    transitTotalMin: Math.round(transitTravelMinutes + visitMinutesMin),
    transitTotalMax: Math.round(transitTravelMinutes + visitMinutesMax),
  };
};

const formatMinutesRange = (minA, minB) => {
  const fmt = (m) => {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  };
  return `${fmt(minA)} – ${fmt(minB)}`;
};

const ShimmerBlock = ({ width: w, height: h, style, radius = 8 }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 250],
  });

  return (
    <View
      style={[
        {
          width: w,
          height: h,
          borderRadius: radius,
          backgroundColor: "#e5e7eb",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: 100,
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.6)",
          transform: [{ translateX }, { skewX: "-20deg" }],
        }}
      />
    </View>
  );
};

const SkeletonHeader = () => (
  <View style={styles.skeletonHeader}>
    <View style={{ flex: 1, gap: 6 }}>
      <ShimmerBlock width={110} height={16} radius={6} />
      <ShimmerBlock width={150} height={11} radius={4} />
    </View>
    <ShimmerBlock width={90} height={32} radius={10} />
  </View>
);

const SkeletonSearchBar = () => (
  <View style={styles.skeletonSearchRow}>
    <ShimmerBlock width="100%" height={46} radius={14} style={{ flex: 1 }} />
    <ShimmerBlock width={46} height={46} radius={14} />
  </View>
);

const SkeletonDeliveryCard = () => (
  <View style={styles.skeletonCard}>
    <ShimmerBlock width="100%" height={110} radius={0} />
    <View style={{ padding: 12, gap: 8 }}>
      <ShimmerBlock width={130} height={14} radius={5} />
      <ShimmerBlock width={170} height={11} radius={4} />
      <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginVertical: 4 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <ShimmerBlock width={80} height={18} radius={999} />
        <ShimmerBlock width={16} height={16} radius={4} />
      </View>
    </View>
  </View>
);

const Toast = ({ visible, type, title, message, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 60,
      }).start();
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => onHide && onHide());
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible, slideAnim, onHide]);

  if (!visible) return null;

  const config = {
    error: { bg: COLORS.dangerBg, color: COLORS.brand, icon: "alert-circle" },
    warning: { bg: COLORS.warningBg, color: COLORS.warning, icon: "warning" },
    success: { bg: COLORS.successBg, color: COLORS.success, icon: "checkmark-circle" },
    info: { bg: COLORS.infoBg, color: COLORS.info, icon: "information-circle" },
  };
  const cfg = config[type] || config.info;

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.toastIcon, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle}>{title}</Text>
        {message && <Text style={styles.toastMessage}>{message}</Text>}
      </View>
      <TouchableOpacity
        onPress={() => {
          Animated.timing(slideAnim, {
            toValue: -120,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onHide && onHide());
        }}
        style={styles.toastClose}
      >
        <Ionicons name="close" size={16} color={COLORS.textMid} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const MapSalesMan = () => {
  const { startTimer, stopTimer } = useContext(TimerContext);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });
  const mapRef = useRef(null);

  const [filteredClients, setFilteredClients] = useState([]);
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

  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [routeId, setRouteId] = useState("");
  const { token, idOwner, salesId } = useContext(AuthContext);
  const [loadingButton, setLoadingButton] = useState(false);

  const [activeDestination, setActiveDestination] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [durationInTraffic, setDurationInTraffic] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [trafficLevel, setTrafficLevel] = useState("normal");

  const [distanceToClient, setDistanceToClient] = useState(null);

  const [optimizedStops, setOptimizedStops] = useState([]);
  const [routeEstimates, setRouteEstimates] = useState(null);
  const [showRouteSummary, setShowRouteSummary] = useState(false);

  const [toast, setToast] = useState({ visible: false, type: "info", title: "", message: "" });

  const showToast = (type, title, message) => {
    setToast({ visible: true, type, title, message: message || "" });
  };

  const hideToast = () => {
    setToast((t) => ({ ...t, visible: false }));
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Permiso de ubicación",
          message: "Esta app necesita acceso a tu ubicación",
          buttonNeutral: "Pregúntame luego",
          buttonNegative: "Cancelar",
          buttonPositive: "OK",
        }
      );
      setLocationPermissionGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      setLocationPermissionGranted(true);
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const startRouteToday = async () => {
    try {
      const response = await axios.post(
        API_URL + "/whatsapp/salesman/route/id",
        { salesMan: salesId, id_owner: idOwner, status: "Por iniciar" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setListRoute(response.data);
    } catch (error) {
      showToast("error", "Error al cargar rutas", "No pudimos obtener tus rutas");
    }
  };

  const getRoutesById = async (value) => {
    try {
      const response = await axios.post(
        API_URL + "/whatsapp/salesman/route/sales/id",
        { _id: value, id_owner: idOwner },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoute(response.data);
      return response.data;
    } catch (error) {
      showToast("error", "Error al cargar ruta", "Intenta de nuevo");
      return null;
    }
  };

  const uploadRoute = async (value, visitStartTime, visitEndTime, visitTime) => {
    try {
      await axios.put(
        API_URL + "/whatsapp/route/sales/id",
        {
          status: "En progreso",
          id_owner: idOwner,
          _id: routeId,
          routeId: value._id,
          visitStatus: true,
          visitTime: visitTime,
          orderTaken: false,
          visitStartTime: visitStartTime,
          visitEndTime: visitEndTime,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      showToast("warning", "Sincronización pendiente", "Tu visita se guardará al recuperar señal");
    }
  };

  const uploadProgressRoute = async () => {
    try {
      await axios.put(
        API_URL + "/whatsapp/route/progress/id",
        { id_owner: idOwner, _id: routeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      showToast("warning", "Progreso no actualizado", "Conexión inestable");
    }
  };

  async function getUserLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      showToast("error", "Permiso denegado", "Habilita la ubicación en ajustes");
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
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
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  }

  const fetchActivity = async (selectedClient2, text) => {
    try {
      const userLocation = await getUserLocation();
      const formattedTime = formatTime(timer);
      const totalSeconds = timer;
      await axios.post(
        API_URL + "/whatsapp/salesman/activity",
        {
          salesMan: salesId,
          details: text,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          location: selectedClient2.client_location.direction,
          id_owner: idOwner,
          clientName: selectedClient2._id,
          visitDuration: formattedTime,
          visitDurationSeconds: totalSeconds,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      showToast("warning", "Actividad no enviada", "Se reintentará en segundo plano");
    }
  };

  const computeArrivalTime = (durationInSeconds) => {
    const arrival = new Date(Date.now() + durationInSeconds * 1000);
    return arrival.toLocaleTimeString("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
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
      }
    } catch (error) {
    }
  };

  const handleStartVisit = async (selectedClient2, text) => {
    const userLocation = await getUserLocation();
    if (!userLocation) return;

    const destLat = parseFloat(selectedClient2.client_location?.latitud);
    const destLng = parseFloat(selectedClient2.client_location?.longitud);
    const distanceMeters = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      destLat,
      destLng
    );

    if (distanceMeters > GEOFENCE_RADIUS_METERS) {
      const distanceFormatted =
        distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(1)} km`
          : `${Math.round(distanceMeters)} m`;
      showToast(
        "warning",
        "Estás demasiado lejos",
        `Acércate a menos de ${GEOFENCE_RADIUS_METERS}m. Distancia actual: ${distanceFormatted}`
      );
      return;
    }

    setLoadingButton(true);
    try {
      const startTime = await startTimer();
      startMapping();
      setActiveDestination({
        latitude: destLat,
        longitude: destLng,
        clientId: selectedClient2.client_location._id,
      });
      await fetchETA(userLocation, { latitude: destLat, longitude: destLng });
      await uploadRoute(selectedClient2, startTime, null, null);
      await fetchActivity(selectedClient2, text);
      setIsTimerRunning(true);
      showToast("success", "Visita iniciada", `Cliente: ${selectedClient2.name || selectedClient2.nombre}`);

      if (mapRef.current) {
        mapRef.current.fitToCoordinates(
          [
            userLocation,
            { latitude: destLat, longitude: destLng },
          ],
          {
            edgePadding: { top: 200, right: 80, bottom: 320, left: 80 },
            animated: true,
          }
        );
      }
    } catch (error) {
      showToast("error", "No se pudo iniciar", "Intenta de nuevo en un momento");
    } finally {
      setLoadingButton(false);
    }
  };

  const handleFinishVisit = async (selectedClient2, text) => {
    setLoadingButton(true);
    try {
      const visitTime = formatTime(timer);
      setTimer(0);
      const stopTime = await stopTimer();
      setShowRoute(true);
      setShowClients(false);
      setActiveDestination(null);
      await uploadRoute(selectedClient2, null, stopTime, visitTime);
      await uploadProgressRoute();
      await getRoutesById(routeId);
      await fetchActivity(selectedClient2, text);
      setModal(false);
      setSelectedClient(null);
      await AsyncStorage.removeItem("timer_start");
      setIsTimerRunning(false);
      showToast("success", "Visita finalizada", `Duración: ${visitTime}`);
    } catch (error) {
      showToast("error", "Error al finalizar", "Tus datos se guardarán cuando haya conexión");
    } finally {
      setLoadingButton(false);
    }
  };

  const handleStartRoute = async (item) => {
    setLoadingButton(true);
    try {
      setRouteId(item._id);
      const routeData = await getRoutesById(item._id);

      let userLocation = origin;
      if (!userLocation || userLocation.latitude === 0) {
        const fresh = await getUserLocation();
        if (fresh) userLocation = fresh;
      }

      const stops = routeData?.[0]?.route || [];
      const pending = stops.filter((s) => !s.visitStatus);

      if (pending.length > 0 && userLocation?.latitude) {
        const ordered = optimizeRouteFromOrigin(
          userLocation.latitude,
          userLocation.longitude,
          pending
        );
        const completed = stops.filter((s) => s.visitStatus);
        const newOrdered = [...completed, ...ordered];
        setOptimizedStops(newOrdered);
        const estimates = estimateRouteTotals(ordered);
        setRouteEstimates(estimates);

        if (mapRef.current && ordered.length > 0) {
          const coords = [
            userLocation,
            ...ordered.map((s) => ({
              latitude: parseFloat(s.client_location.latitud),
              longitude: parseFloat(s.client_location.longitud),
            })),
          ];
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 200, right: 60, bottom: 380, left: 60 },
            animated: true,
          });
        }
      } else {
        setOptimizedStops(stops);
        setRouteEstimates(null);
      }

      startMapping();
      setShowRouteSummary(true);
      showToast("success", "Ruta optimizada", "Ordenada desde tu ubicación actual");
    } catch (error) {
      showToast("error", "Error al iniciar ruta", "Intenta de nuevo");
    } finally {
      setLoadingButton(false);
    }
  };

  const showRoutesList = () => {
    setShowRoutes(true);
    setShowClients(false);
    setShowRoute(false);
    startRouteToday();
  };

  useEffect(() => {
    getUserLocation();
    startRouteToday();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.post(
        API_URL + "/whatsapp/maps/list/sales/id",
        { id_owner: idOwner, sales_id: salesId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClients(response.data.users);
      setFilteredClients(response.data.users);
      setLoading(false);
    } catch (error) {
      showToast("error", "Error al cargar clientes", "Revisa tu conexión");
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    const filtered = clients.filter((client) =>
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
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prevTime) => prevTime + 1);
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

  useEffect(() => {
    if (selectedClient && origin.latitude !== 0) {
      const lat = parseFloat(selectedClient.client_location?.latitud);
      const lng = parseFloat(selectedClient.client_location?.longitud);
      if (lat && lng) {
        const d = haversineDistance(origin.latitude, origin.longitude, lat, lng);
        setDistanceToClient(d);
      } else {
        setDistanceToClient(null);
      }
    } else {
      setDistanceToClient(null);
    }
  }, [selectedClient, origin]);

  const centerMapOnClient = (client) => {
    setSelectedClient(client);
    setModal(true);
    mapRef.current?.animateToRegion(
      {
        latitude: client.client_location.latitud,
        longitude: client.client_location.longitud,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    );
  };

  const centerMapOnClient2 = (client) => {
    setSelectedClient(client);
    mapRef.current?.animateToRegion(
      {
        latitude: client.client_location.latitud,
        longitude: client.client_location.longitud,
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

  const formatDistance = (meters) => {
    if (meters == null) return "—";
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  const navigate = () => {
    navigation.navigate("Order", { screen: "ProductListScreen" });
  };

  const showAllClients = () => {
    setShowClients(true);
    setShowRoute(false);
    setShowRoutes(false);
    setShowRouteSummary(false);
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
    return `${day}-${month}-${year}`;
  };

  const getHeaderTitle = () => {
    if (showRoute) return "Mi Ruta Activa";
    if (showRoutes) return "Mis Rutas";
    return "Clientes";
  };

  const getHeaderSubtitle = () => {
    if (showRoute) return `${optimizedStops.length || route?.[0]?.route?.length || 0} paradas en esta ruta`;
    if (showRoutes) return `${listRoute?.length || 0} rutas disponibles`;
    return `${filteredClients.length} ${filteredClients.length === 1 ? "cliente" : "clientes"} cerca`;
  };

  const getTrafficStyle = (level) => {
    if (level === "heavy") return { color: COLORS.brand, bg: COLORS.dangerBg, label: "Tráfico denso" };
    if (level === "moderate") return { color: COLORS.warning, bg: COLORS.warningBg, label: "Tráfico moderado" };
    return { color: COLORS.success, bg: COLORS.successBg, label: "Tráfico fluido" };
  };

  const getRouteStrokeColor = () => {
    if (trafficLevel === "heavy") return COLORS.brand;
    if (trafficLevel === "moderate") return COLORS.warning;
    return "#1f2937";
  };

  const withinGeofence = distanceToClient !== null && distanceToClient <= GEOFENCE_RADIUS_METERS;

  const displayStops = optimizedStops.length > 0 ? optimizedStops : route?.[0]?.route || [];
  const priorityStopId = (() => {
    if (!displayStops || displayStops.length === 0) return null;
    const firstPending = displayStops.find((s) => !s.visitStatus);
    return firstPending?.client_location?._id || null;
  })();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.bg }]} />

        <SafeAreaView edges={["top"]} style={styles.topHeaderSafe}>
          <View style={styles.topHeader}>
            <SkeletonHeader />
          </View>
        </SafeAreaView>

        <View style={styles.topActionsRow}>
          <SkeletonSearchBar />
        </View>

        <View style={styles.cardsWrapper}>
          <View style={styles.cardsHeaderRow}>
            <ShimmerBlock width={120} height={16} radius={5} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
            scrollEnabled={false}
          >
            <SkeletonDeliveryCard />
            <SkeletonDeliveryCard />
            <SkeletonDeliveryCard />
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        style={styles.map}
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
        {showClients &&
          !showRoute &&
          filteredClients.map((client, index) => (
            <ClientMarker key={index} client={client} />
          ))}

        {!showClients &&
          showRoute &&
          !showRoutes &&
          displayStops?.length > 0 &&
          displayStops.map((point, index) => {
            const isCurrentClient =
              isTimerRunning &&
              selectedClient?.client_location?._id === point.client_location._id;
            const isPriority =
              !isTimerRunning && point.client_location._id === priorityStopId;

            let markerBg = COLORS.brand;
            if (point.visitStatus) markerBg = COLORS.success;
            if (isPriority) markerBg = COLORS.warning;
            if (isCurrentClient) markerBg = "#1f2937";

            return (
              <React.Fragment key={index}>
                <Marker
                  coordinate={{
                    latitude: parseFloat(point.client_location.latitud),
                    longitude: parseFloat(point.client_location.longitud),
                  }}
                  onPress={() => {
                    if (
                      !isTimerRunning ||
                      selectedClient?.client_location._id === point.client_location._id
                    ) {
                      setSelectedClient(point);
                      setModal(true);
                    }
                  }}
                >
                  <View style={styles.markerWrapper}>
                    <View
                      style={[
                        styles.markerCircle,
                        { backgroundColor: markerBg },
                        isPriority && {
                          borderColor: "#fff",
                          borderWidth: 3,
                          shadowOpacity: 0.5,
                        },
                      ]}
                    >
                      {point.visitStatus ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : isCurrentClient ? (
                        <Ionicons name="navigate" size={12} color="#fff" />
                      ) : isPriority ? (
                        <Ionicons name="flash" size={13} color="#fff" />
                      ) : (
                        <Text style={styles.markerText}>{index + 1}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.markerArrow,
                        { borderTopColor: markerBg },
                      ]}
                    />
                  </View>
                </Marker>
              </React.Fragment>
            );
          })}

        {!isTimerRunning &&
          showRoute &&
          origin.latitude !== 0 &&
          displayStops.filter((s) => !s.visitStatus).length > 0 && (
            <MapViewDirections
              origin={origin}
              destination={(() => {
                const pending = displayStops.filter((s) => !s.visitStatus);
                const last = pending[pending.length - 1];
                return {
                  latitude: parseFloat(last.client_location.latitud),
                  longitude: parseFloat(last.client_location.longitud),
                };
              })()}
              waypoints={(() => {
                const pending = displayStops.filter((s) => !s.visitStatus);
                return pending.slice(0, -1).map((s) => ({
                  latitude: parseFloat(s.client_location.latitud),
                  longitude: parseFloat(s.client_location.longitud),
                }));
              })()}
              optimizeWaypoints={false}
              apikey={GOOGLE_API_KEY}
              strokeColor={COLORS.brand}
              strokeWidth={5}
            />
          )}

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

      <SafeAreaView edges={["top"]} style={styles.topHeaderSafe}>
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
                <View style={styles.timerDotLarge} />
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
            {(showRoute || showRoutes) && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => showAllClients()}
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

        {showRoute && !isTimerRunning && showRouteSummary && routeEstimates && (
          <View style={styles.routeSummaryPanel}>
            <View style={styles.routeSummaryHeader}>
              <View style={styles.routeSummaryIcon}>
                <Ionicons name="flash" size={16} color={COLORS.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeSummaryTitle}>Ruta optimizada</Text>
                <Text style={styles.routeSummarySubtitle}>
                  Ordenada desde tu ubicación · {routeEstimates.totalDistanceKm.toFixed(1)} km
                </Text>
              </View>
              <TouchableOpacity
                style={styles.routeSummaryClose}
                onPress={() => setShowRouteSummary(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color={COLORS.textMid} />
              </TouchableOpacity>
            </View>

            <View style={styles.routeSummaryDivider} />

            <View style={styles.transportRow}>
              <View style={styles.transportCard}>
                <View style={[styles.transportIcon, { backgroundColor: COLORS.infoBg }]}>
                  <Ionicons name="car-sport" size={16} color={COLORS.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.transportLabel}>Auto</Text>
                  <Text style={styles.transportTime}>
                    {formatMinutesRange(routeEstimates.carTotalMin, routeEstimates.carTotalMax)}
                  </Text>
                </View>
              </View>
              <View style={styles.transportCard}>
                <View style={[styles.transportIcon, { backgroundColor: COLORS.warningBg }]}>
                  <Ionicons name="bus" size={16} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.transportLabel}>Transporte público</Text>
                  <Text style={styles.transportTime}>
                    {formatMinutesRange(routeEstimates.transitTotalMin, routeEstimates.transitTotalMax)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.visitNoteRow}>
              <Ionicons name="time-outline" size={11} color={COLORS.textMid} />
              <Text style={styles.visitNoteText}>
                {VISIT_DURATION_MIN}–{VISIT_DURATION_MAX} min por parada
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {showClients && !showRoute && !showRoutes && !isTimerRunning && (
        <View style={styles.topActionsRow}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMid} />
            <TextInput
              style={styles.searchInputModern}
              placeholder="Buscar cliente..."
              placeholderTextColor={COLORS.textLight}
              onChangeText={handleSearch}
            />
          </View>

          <TouchableOpacity
            style={styles.routesFab}
            onPress={() => showRoutesList()}
            activeOpacity={0.9}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            {listRoute?.length > 0 && (
              <View style={styles.routesFabBadge}>
                <Text style={styles.routesFabBadgeText}>{listRoute.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {showClients && !showRoute && !showRoutes && !isTimerRunning && filteredClients.length > 0 && (
        <View style={styles.cardsWrapper}>
          <View style={styles.cardsHeaderRow}>
            <Text style={styles.cardsHeaderTitle}>Cerca de ti</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
            decelerationRate="fast"
            snapToInterval={236}
            snapToAlignment="start"
          >
            {filteredClients.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.deliveryCard}
                onPress={() => centerMapOnClient2(item)}
                activeOpacity={0.85}
              >
                <View style={styles.deliveryImageWrapper}>
                  <Image
                    source={{
                      uri: item.identificationImage || "https://via.placeholder.com/300",
                    }}
                    style={styles.deliveryImage}
                  />
                  <View style={styles.imageBadge}>
                    <View style={styles.imageBadgeDot} />
                    <Text style={styles.imageBadgeText}>Activo</Text>
                  </View>
                </View>

                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryName} numberOfLines={1}>
                    {item.name} {item.lastName}
                  </Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={12} color={COLORS.brand} />
                    <Text style={styles.deliveryAddress} numberOfLines={1}>
                      {item.client_location.direction}
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
            ))}
          </ScrollView>
        </View>
      )}

      {showRoutes && !showRoute && !isTimerRunning && (
        <View style={styles.routesListWrapper}>
          <View style={styles.cardsHeaderRow}>
            <Text style={styles.cardsHeaderTitle}>Mis rutas asignadas</Text>
            <Text style={styles.cardsHeaderCount}>
              {listRoute?.length || 0}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              listRoute?.length === 0 ? styles.emptyScrollContainer : styles.cardsContainer
            }
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
                    onPress={() => handleStartRoute(item)}
                    activeOpacity={0.85}
                    disabled={loadingButton}
                  >
                    <View style={styles.routeCardHeader}>
                      <View style={styles.routeIconBox}>
                        <Ionicons name="map" size={18} color={COLORS.brand} />
                      </View>
                      <View style={styles.routeBadge}>
                        <Ionicons name="calendar-outline" size={10} color={COLORS.textMid} />
                        <Text style={styles.routeBadgeText}>
                          {formatDate(item.startDate)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.routeCardTitle} numberOfLines={2}>
                      {item.details}
                    </Text>

                    <View style={styles.routeProgressSection}>
                      <View style={styles.routeProgressTop}>
                        <Text style={styles.routeProgressLabel}>Progreso</Text>
                        <Text style={[styles.routeProgressPct, { color: progressColor }]}>
                          {progress}%
                        </Text>
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
                    </View>

                    <View style={styles.routeCta}>
                      {loadingButton ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.routeCtaText}>Iniciar ruta</Text>
                          <Ionicons name="arrow-forward" size={14} color="#fff" />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="map-outline" size={32} color={COLORS.textLight} />
                </View>
                <Text style={styles.emptyCardTextTitle}>Sin rutas asignadas</Text>
                <Text style={styles.emptyCardTextSubtitle}>
                  No hay rutas disponibles para hoy
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {showRoute && displayStops?.length > 0 && !isTimerRunning && (
        <View style={styles.cardsWrapper}>
          <View style={styles.cardsHeaderRow}>
            <Text style={styles.cardsHeaderTitle}>Paradas optimizadas</Text>
            <Text style={styles.cardsHeaderCount}>
              {displayStops.filter((p) => p.visitStatus).length}/{displayStops.length}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
            decelerationRate="fast"
            snapToInterval={236}
            snapToAlignment="start"
          >
            {displayStops.map((item, index) => {
              const visited = item.visitStatus;
              const isPriority = item.client_location._id === priorityStopId;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.deliveryCard,
                    visited && { borderWidth: 2, borderColor: COLORS.success },
                    isPriority && { borderWidth: 2, borderColor: COLORS.warning },
                  ]}
                  onPress={() => centerMapOnClient(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.deliveryImageWrapper}>
                    <Image
                      source={{
                        uri: item.identificationImage || "https://via.placeholder.com/300",
                      }}
                      style={styles.deliveryImage}
                    />
                    <View
                      style={[
                        styles.stopNumberBadge,
                        isPriority && { backgroundColor: COLORS.warning },
                        visited && { backgroundColor: COLORS.success },
                      ]}
                    >
                      <Text style={styles.stopNumberText}>{index + 1}</Text>
                    </View>
                    <View
                      style={[
                        styles.imageBadge,
                        visited
                          ? { backgroundColor: COLORS.success }
                          : isPriority
                          ? { backgroundColor: COLORS.warning }
                          : { backgroundColor: "#fff" },
                      ]}
                    >
                      {visited ? (
                        <>
                          <Ionicons name="checkmark-circle" size={10} color="#fff" />
                          <Text style={[styles.imageBadgeText, { color: "#fff" }]}>
                            Visitado
                          </Text>
                        </>
                      ) : isPriority ? (
                        <>
                          <Ionicons name="flash" size={10} color="#fff" />
                          <Text style={[styles.imageBadgeText, { color: "#fff" }]}>
                            Empezar aquí
                          </Text>
                        </>
                      ) : (
                        <>
                          <View
                            style={[styles.imageBadgeDot, { backgroundColor: COLORS.textMid }]}
                          />
                          <Text
                            style={[styles.imageBadgeText, { color: COLORS.textMid }]}
                          >
                            Pendiente
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.deliveryInfo}>
                    <Text style={styles.deliveryName} numberOfLines={1}>
                      {item.name} {item.lastName}
                    </Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-sharp" size={12} color={COLORS.brand} />
                      <Text style={styles.deliveryAddress} numberOfLines={1}>
                        {item.client_location.direction}
                      </Text>
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={styles.cardFooter}>
                      {item._distanceFromPrev != null && item._distanceFromPrev !== Infinity ? (
                        <View style={styles.metaChip}>
                          <Ionicons name="navigate-outline" size={10} color={COLORS.textMid} />
                          <Text style={styles.metaChipText}>
                            {formatDistance(item._distanceFromPrev)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.metaChip}>
                          <Ionicons name="flag-outline" size={10} color={COLORS.textMid} />
                          <Text style={styles.metaChipText}>Parada {index + 1}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={16} color={COLORS.brand} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {modality && selectedClient && (
        <View style={[styles.bottomSheet, { bottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={styles.sheetAvatar}>
              {selectedClient.avatarUrl ? (
                <Image source={{ uri: selectedClient.avatarUrl }} style={styles.sheetAvatarImg} />
              ) : (
                <Text style={styles.sheetAvatarText}>
                  {selectedClient.name
                    ? `${selectedClient.name[0]?.toUpperCase()}${selectedClient.lastName?.[0]?.toUpperCase() || ""}`
                    : selectedClient.nombre?.[0]?.toUpperCase()}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sheetClientName} numberOfLines={1}>
                {selectedClient.name
                  ? `${selectedClient.name} ${selectedClient.lastName}`
                  : selectedClient.nombre}
              </Text>
              {selectedClient.client_location?.direction && (
                <View style={styles.sheetAddressRow}>
                  <Ionicons name="location-sharp" size={12} color={COLORS.brand} />
                  <Text style={styles.sheetAddress} numberOfLines={2}>
                    {selectedClient.client_location.direction}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.sheetCloseIcon}
              onPress={() => setModal(false)}
            >
              <Ionicons name="close" size={18} color={COLORS.textMid} />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetStatsRow}>
            {!isTimerRunning && distanceToClient !== null && (
              <View
                style={[
                  styles.sheetStat,
                  { backgroundColor: withinGeofence ? COLORS.successBg : COLORS.warningBg },
                ]}
              >
                <Ionicons
                  name={withinGeofence ? "location" : "navigate-outline"}
                  size={12}
                  color={withinGeofence ? COLORS.success : COLORS.warning}
                />
                <Text
                  style={[
                    styles.sheetStatText,
                    { color: withinGeofence ? COLORS.success : COLORS.warning },
                  ]}
                >
                  {formatDistance(distanceToClient)}
                </Text>
              </View>
            )}
            {selectedClient.visitStatus && (
              <View style={styles.sheetStat}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.sheetStatText}>Ya visitado</Text>
              </View>
            )}
            {isTimerRunning && (
              <View style={[styles.sheetStat, { backgroundColor: COLORS.warningBg }]}>
                <View style={[styles.pulseDot, { backgroundColor: COLORS.warning }]} />
                <Text style={[styles.sheetStatText, { color: COLORS.warning }]}>
                  {formatTime(timer)}
                </Text>
              </View>
            )}
            {!isTimerRunning &&
              !selectedClient.visitStatus &&
              selectedClient.client_location?._id === priorityStopId && (
                <View style={[styles.sheetStat, { backgroundColor: COLORS.warningBg }]}>
                  <Ionicons name="flash" size={12} color={COLORS.warning} />
                  <Text style={[styles.sheetStatText, { color: COLORS.warning }]}>
                    Sugerido empezar aquí
                  </Text>
                </View>
              )}
          </View>

          {!isTimerRunning && !selectedClient.visitStatus && (
            <>
              {!withinGeofence && distanceToClient !== null && (
                <View style={styles.geofenceWarning}>
                  <Ionicons name="warning" size={14} color={COLORS.warning} />
                  <Text style={styles.geofenceWarningText}>
                    Debes estar a menos de {GEOFENCE_RADIUS_METERS}m del cliente
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.startVisitButton,
                  !withinGeofence && styles.startVisitButtonDisabled,
                ]}
                onPress={() => handleStartVisit(selectedClient, "Visita al cliente")}
                disabled={loadingButton || !withinGeofence}
                activeOpacity={0.9}
              >
                {loadingButton ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={withinGeofence ? "play" : "lock-closed"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.startVisitText}>
                      {withinGeofence ? "Iniciar visita" : "Fuera de rango"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {isTimerRunning && (
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.finishVisitButton}
                onPress={() => handleFinishVisit(selectedClient, "Termina la visita")}
                disabled={loadingButton}
                activeOpacity={0.9}
              >
                {loadingButton ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.startVisitText}>Finalizar visita</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  map: { ...StyleSheet.absoluteFillObject },

  topHeaderSafe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 2,
  },
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

  skeletonHeader: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skeletonSearchRow: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonCard: {
    width: 224,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },

  routeSummaryPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  routeSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  routeSummaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  routeSummarySubtitle: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 1,
  },
  routeSummaryClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  routeSummaryDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 12,
  },
  transportRow: {
    flexDirection: "row",
    gap: 8,
  },
  transportCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  transportIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  transportLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  transportTime: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  visitNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  visitNoteText: {
    fontSize: 10,
    color: COLORS.textMid,
    fontWeight: "600",
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
  timerDotLarge: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning },
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

  toast: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 14,
    zIndex: 100,
  },
  toastIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  toastMessage: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 1,
    lineHeight: 15,
  },
  toastClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },

  topActionsRow: {
    position: "absolute",
    top: 76,
    left: 16,
    right: 16,
    zIndex: 9,
    flexDirection: "row",
    gap: 10,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  searchInputModern: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  routesFab: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  routesFabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.brand,
  },
  routesFabBadgeText: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "800",
  },

  markerWrapper: { alignItems: "center" },
  markerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
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
    borderTopColor: COLORS.brand,
    marginTop: -2,
  },

  cardsWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    zIndex: 5,
  },
  routesListWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    zIndex: 5,
  },
  cardsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  cardsHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowRadius: 4,
  },
  cardsHeaderCount: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.brand,
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyScrollContainer: {
    paddingHorizontal: 16,
    width: "100%",
  },

  deliveryCard: {
    width: 224,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  deliveryImageWrapper: {
    position: "relative",
    height: 110,
    backgroundColor: COLORS.borderLight,
  },
  deliveryImage: { width: "100%", height: "100%" },
  imageBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  imageBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  imageBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success,
  },
  stopNumberBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  stopNumberText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  deliveryInfo: { padding: 12 },
  deliveryName: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  deliveryAddress: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaChipText: { fontSize: 10, fontWeight: "600", color: COLORS.textMid },

  routeCard: {
    width: 260,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  routeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  routeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  routeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  routeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
  },
  routeCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 19,
  },
  routeProgressSection: { marginBottom: 12 },
  routeProgressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  routeProgressLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  routeProgressPct: { fontSize: 13, fontWeight: "800" },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  routeCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.brand,
    paddingVertical: 10,
    borderRadius: 12,
  },
  routeCtaText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  emptyCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyCardTextTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  emptyCardTextSubtitle: {
    fontSize: 12,
    color: COLORS.textMid,
    fontWeight: "500",
    textAlign: "center",
  },

  bottomSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
    zIndex: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sheetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  sheetAvatarImg: { width: "100%", height: "100%" },
  sheetAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.5,
  },
  sheetClientName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  sheetAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  sheetAddress: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMid,
    fontWeight: "500",
    lineHeight: 16,
  },
  sheetCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetStatsRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  sheetStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sheetStatText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
    fontVariant: ["tabular-nums"],
  },
  pulseDot: { width: 7, height: 7, borderRadius: 3.5 },

  geofenceWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  geofenceWarningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.warning,
    lineHeight: 15,
  },

  startVisitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  startVisitButtonDisabled: {
    backgroundColor: COLORS.textLight,
    shadowOpacity: 0,
  },
  finishVisitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: COLORS.success,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  startVisitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  orderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: COLORS.brand,
    paddingVertical: 12,
    borderRadius: 14,
  },
  orderButtonText: {
    color: COLORS.brand,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

export default MapSalesMan;