import React, { useEffect, useCallback, useRef,useState, useContext } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Image,
    RefreshControl,
  StatusBar,
  Platform,
  PermissionsAndroid,
    Animated,
  Easing,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { GOOGLE_API_KEY } from "../config";
import { AuthContext } from "../AuthContext";
import { Ionicons } from "@expo/vector-icons";

import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
const COLORS = {
  brand: "#D3423E",
  brandDark: "#bb3330",
  brandLight: "#ff6b6b",
  bg: "#ffffff",
  card: "#ffffff",
  border: "#b4b8c3",
  borderLight: "#d9dce2e3",
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

const getProgressColor = (pct) => {
  if (pct >= 100) return COLORS.success;
  if (pct >= 70) return COLORS.warning;
  return COLORS.brand;
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
const SkeletonHero = () => (
  <View style={styles.skeletonHero}>
    <View style={styles.skeletonHeroTop}>
      <ShimmerBlock width={44} height={44} radius={22} />
      <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
        <ShimmerBlock width={50} height={11} radius={5} />
        <ShimmerBlock width={140} height={16} radius={6} />
      </View>
    </View>
    <ShimmerBlock width={180} height={11} radius={5} style={{ marginBottom: 16 }} />
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonKpi}>
          <ShimmerBlock width={30} height={30} radius={10} />
          <View style={{ flex: 1, gap: 4 }}>
            <ShimmerBlock width={45} height={9} radius={4} />
            <ShimmerBlock width={28} height={14} radius={5} />
          </View>
        </View>
      ))}
    </View>
  </View>
);
const SkeletonSection = ({ children }) => (
  <View style={styles.skeletonSectionWrap}>{children}</View>
);
const SkeletonMapBlock = () => (
  <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
    <View style={{ marginBottom: 12 }}>
      <ShimmerBlock width={120} height={18} radius={6} style={{ marginBottom: 6 }} />
      <ShimmerBlock width={160} height={11} radius={5} />
    </View>
    <ShimmerBlock width="100%" height={height * 0.26} radius={18} />
  </View>
);
const SkeletonOrderCard = () => (
  <View style={styles.skeletonOrderCard}>
    <View style={styles.skeletonOrderTop}>
      <ShimmerBlock width={100} height={18} radius={6} />
      <ShimmerBlock width={70} height={20} radius={6} />
    </View>
    <ShimmerBlock width={180} height={15} radius={5} style={{ marginBottom: 6 }} />
    <ShimmerBlock width={110} height={11} radius={5} style={{ marginBottom: 12 }} />
    <View style={styles.skeletonOrderDivider} />
    <View style={styles.skeletonOrderBottom}>
      <ShimmerBlock width={40} height={11} radius={5} />
      <View style={{ flexDirection: "row", gap: 6 }}>
        <ShimmerBlock width={70} height={18} radius={999} />
        <ShimmerBlock width={70} height={18} radius={999} />
      </View>
    </View>
  </View>
);
const SkeletonObjectiveItem = ({ isLast }) => (
  <View style={[styles.skeletonObjItem, !isLast && styles.skeletonObjBorder]}>
    <View style={styles.skeletonObjTop}>
      <View style={{ flex: 1, gap: 5 }}>
        <ShimmerBlock width={120} height={14} radius={5} />
        <ShimmerBlock width={90} height={11} radius={4} />
      </View>
      <ShimmerBlock width={50} height={20} radius={999} />
    </View>
    <ShimmerBlock width="100%" height={6} radius={999} />
  </View>
);
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5f3e5" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffd6d4" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#D3423E" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
];
const { height, width } = Dimensions.get("window");
export default function DeliveryPage() {
  const navigation = useNavigation();
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [route, setRoute] = useState(null);
  const today = new Date();
  const [profile, setProfile] = useState(null);
  const [id, setId] = useState([]);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const { token, idOwner, salesId } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  const fetchProfile = async () => {
    try {
      const response = await axios.post(API_URL + "/whatsapp/delivery/id", {
        id_owner: idOwner,
        _id: salesId,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setId(response.data._id);
        setProfile(response.data);
        await startRoute();
      }
    } catch (error) {
      console.error("Error al obtener los datos:", error);
    } finally {
      setLoading(false);
    }
  };
  const startRoute = async () => {
    setIsRouteLoading(true);
    try {
      const response = await axios.post(API_URL + "/whatsapp/delivery/list/order/id", {
        delivery: salesId,
        id_owner: idOwner,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.status === 200) {
        setRoute(response.data);
        setSalesData(response.data);
        setFilteredData(response.data);
        setRouteLoaded(true);
      }
    } catch (error) {
      console.error("Error al iniciar la ruta:", error);
    } finally {
      setIsRouteLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(salesData);
    } else {
      const filtered = salesData.map((ruta) => ({
        ...ruta,
        route: ruta.route.filter((item) =>
          `${item.name} ${item.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter((ruta) => ruta.route.length > 0);

      setFilteredData(filtered);
    }
  }, [searchTerm, salesData]);

  const goToClientDetails = (client) => {
    navigation.navigate("OrderDetailsScreenDeliver", {
      orderId: client._id,
      products: client.products,
      files: client,
    });
  };
  const formatDate2 = (dateString) => {
    const date = new Date(dateString);
    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayOfWeek = daysOfWeek[date.getDay()];
    const day = date.getDate().toString().padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayOfWeek}, ${day} de ${month} del ${year}`;
  };
  const formatDateLong = (s) => {
    const d = new Date(s);
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
  };
  const totalPedidos = filteredData.length;
  const stopsRuta = route?.[0]?.route?.length || 0;

  const getOrderStatusStyle = (status) => {
    switch (status) {
      case "aproved":
        return { bg: COLORS.warningBg, text: COLORS.warning, label: "APROBADO" };
      case "En Ruta":
        return { bg: COLORS.infoBg, text: COLORS.info, label: "EN RUTA" };
      case "Entregado":
        return { bg: COLORS.successBg, text: COLORS.success, label: "ENTREGADO" };
      default:
        return { bg: COLORS.dangerBg, text: COLORS.danger, label: (status || "").toUpperCase() };
    }
  };
  const navigate = () => navigation.navigate("Map", { screen: "MapScreen" });

  const formatDate = (s) => {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchProfile(),
        startRoute(),
      ]);
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };
    useEffect(() => {
      const loadData = async () => {
        try {
          await Promise.all([
            fetchProfile(),
            startRoute(),
          ]);
        } catch (error) {
          console.error("Error cargando datos:", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

 if (loading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
        <View style={styles.container}>
          <SafeAreaView edges={["top"]} style={{ backgroundColor: COLORS.brand }}>
            <SkeletonHero />
          </SafeAreaView>
          <SkeletonMapBlock />
          <SkeletonSection>
            <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
              <View style={{ marginBottom: 12 }}>
                <ShimmerBlock width={160} height={18} radius={6} style={{ marginBottom: 6 }} />
                <ShimmerBlock width={140} height={11} radius={5} />
              </View>
              <ShimmerBlock width="100%" height={46} radius={14} style={{ marginBottom: 12 }} />
              <SkeletonOrderCard />
              <SkeletonOrderCard />
            </View>
          </SkeletonSection>
        </View>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
      <View style={styles.container}>
        <View style={styles.refreshBacker} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#fff"
                        colors={["#fff"]}
                        progressBackgroundColor={COLORS.brand}
                        progressViewOffset={Platform.OS === "android" ? 20 : 0}
                      />
                    }
        >
          <View style={styles.heroWrapper}>
            <View style={styles.heroBg} />
            <SafeAreaView edges={["top"]}>
              <View style={styles.heroContent}>
                <View style={styles.heroTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {profile?.fullName?.[0]?.toUpperCase()}
                      {profile?.lastName?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.heroGreeting}>Hola,</Text>
                    <Text style={styles.heroName} numberOfLines={1}>
                      {profile?.fullName || "Vendedor"} {profile?.lastName || ""}
                    </Text>
                  </View>
                </View>
                <Text style={styles.heroDate}>{formatDateLong(today)}</Text>
                <View style={styles.kpiRow}>
                  <View style={styles.kpiCard}>
                    <View style={[styles.kpiIcon, { backgroundColor: COLORS.infoBg }]}>
                      <Ionicons name="receipt-outline" size={16} color={COLORS.info} />
                    </View>
                    <View>
                      <Text style={styles.kpiLabel}>Pedidos</Text>
                      <Text style={styles.kpiValue}>{totalPedidos}</Text>
                    </View>
                  </View>
                  <View style={styles.kpiCard}>
                    <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningBg }]}>
                      <Ionicons name="location-outline" size={16} color={COLORS.warning} />
                    </View>
                    <View>
                      <Text style={styles.kpiLabel}>Paradas</Text>
                      <Text style={styles.kpiValue}>{stopsRuta}</Text>
                    </View>
                  </View>

                </View>
              </View>
            </SafeAreaView>
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Ruta de hoy</Text>
                <Text style={styles.sectionSubtitle}>
                  {route && route.length > 0
                    ? `${stopsRuta} paradas programadas`
                    : "Sin rutas asignadas"}
                </Text>
              </View>
              {route && route.length > 0 && (
                <TouchableOpacity onPress={navigate} style={styles.openMapBtn}>
                  <Text style={styles.openMapBtnText}>Abrir</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            {locationPermissionGranted && (
              <View style={styles.mapWrapper}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: -17.38156252481452,
                    longitude: -66.1613705009222,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                  }}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                >
                  {route?.[0]?.route?.map((point, index) => (
                    <Marker
                      key={index}
                      coordinate={{
                        latitude: parseFloat(point.client_location.latitud),
                        longitude: parseFloat(point.client_location.longitud),
                      }}
                      title={`${point.name}`}
                    >
                      <View style={styles.markerWrapper}>
                        <View style={styles.markerCircle}>
                          <Text style={styles.markerText}>{index + 1}</Text>
                        </View>
                        <View style={styles.markerArrow} />
                      </View>
                    </Marker>
                  ))}

                  {route?.[0]?.route?.length > 1 && (
                    <MapViewDirections
                      origin={{
                        latitude: parseFloat(route[0].route[0].client_location.latitud),
                        longitude: parseFloat(route[0].route[0].client_location.longitud),
                      }}
                      destination={{
                        latitude: parseFloat(
                          route[0].route[route[0].route.length - 1].client_location.latitud
                        ),
                        longitude: parseFloat(
                          route[0].route[route[0].route.length - 1].client_location.longitud
                        ),
                      }}
                      waypoints={route[0].route.slice(1, -1).map((point) => ({
                        latitude: parseFloat(point.client_location.latitud),
                        longitude: parseFloat(point.client_location.longitud),
                      }))}
                      apikey={GOOGLE_API_KEY}
                      strokeColor="#111827"
                      strokeWidth={4}
                      lineDashPattern={[0]}
                    />
                  )}
                </MapView>
                <View style={styles.mapOverlay}>
                  <Ionicons name="navigate" size={14} color={COLORS.brand} />
                  <Text style={styles.mapOverlayText}>
                    {stopsRuta} {stopsRuta === 1 ? "parada" : "paradas"}
                  </Text>
                </View>
              </View>
            )}
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Pedidos a entregar</Text>
                <Text style={styles.sectionSubtitle}>
                  {totalPedidos} {totalPedidos === 1 ? "pedido" : "pedidos"} pendientes
                </Text>
              </View>
            </View>
            <View style={styles.searchBox}>

              <Ionicons name="search" size={18} color={COLORS.textMid} />

              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o apellido..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor={COLORS.textLight}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm("")}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            </View>
            {filteredData.length > 0 ? (
              filteredData.map((ruta, i) =>
                ruta.route.map((item, index) => {
                  const isPagado = item.payStatus === "Pagado";
                  const orderStatus = getOrderStatusStyle(item.orderStatus);
                  return (

                    <TouchableOpacity
                      key={index}
                      style={styles.orderCard}
                      onPress={() => goToClientDetails(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.orderTop}>
                        <View style={styles.orderDateChip}>
                          <Ionicons name="calendar-outline" size={11} color={COLORS.textMid} />
                          <Text style={styles.orderDateText}>
                            {formatDate(item.creationDate)}
                          </Text>
                        </View>
                        <Text style={styles.orderAmount}>
                          Bs. {Number(item.totalAmount || 0).toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.orderClient} numberOfLines={1}>
                        {(item.name + " " + item.lastName).toUpperCase()}
                      </Text>
                      {item.client_location?.sucursalName ? (
                        <Text style={styles.orderCompany} numberOfLines={1}>
                          {item.client_location?.sucursalName}
                        </Text>
                      ) : null}

                      <View style={styles.orderDivider} />
                      <View style={styles.orderBottom}>
                        <Text style={styles.orderNote}>#{item.receiveNumber}</Text>
                        <View style={styles.orderPills}>
                          <View
                            style={[
                              styles.pill,
                              {
                                backgroundColor: isPagado
                                  ? COLORS.successBg
                                  : COLORS.dangerBg,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.pillDot,
                                {
                                  backgroundColor: isPagado
                                    ? COLORS.success
                                    : COLORS.danger,
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.pillText,
                                {
                                  color: isPagado ? COLORS.success : COLORS.danger,
                                },
                              ]}
                            >
                              {isPagado ? "PAGADO" : "PENDIENTE"}
                            </Text>
                          </View>
                          <View
                            style={[styles.pill, { backgroundColor: orderStatus.bg }]}
                          >
                            <Text
                              style={[styles.pillText, { color: orderStatus.text }]}
                            >
                              {orderStatus.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }))
              ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="search-outline"
                  size={40}
                  color={COLORS.textLight}
                />
                <Text style={styles.emptyTitle}>Sin pedidos</Text>
                <Text style={styles.emptyDesc}>
                  No hay pedidos que coincidan
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  refreshBacker: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: COLORS.brand,
    zIndex: -1,
  },
  skeletonHero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: COLORS.brand,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  skeletonHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  skeletonKpi: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skeletonSectionWrap: {},
  skeletonOrderCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  skeletonOrderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  skeletonOrderDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 10,
  },
  skeletonOrderBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonObjItem: { paddingVertical: 10 },
  skeletonObjBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  skeletonObjTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMid,
    fontSize: 14,
    fontWeight: "500",
  },
  scrollContent: { paddingBottom: 32 },

  heroWrapper: {
    position: "relative",
    paddingBottom: 24,
    marginBottom: 4,
  },
  heroBg: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "100%",
    backgroundColor: COLORS.brand,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  heroGreeting: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" },
  heroName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  bellBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  heroDate: {
    color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "500",
    textTransform: "capitalize", marginBottom: 16,
  },

  kpiRow: { flexDirection: "row", gap: 8 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  kpiIcon: {
    width: 30, height: 30, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  kpiLabel: { fontSize: 10, color: COLORS.textMid, fontWeight: "600" },
  kpiValue: { fontSize: 16, color: COLORS.text, fontWeight: "800", marginTop: -1 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: {
    fontSize: 12, color: COLORS.textMid, fontWeight: "500", marginTop: 2,
  },
  openMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  openMapBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  mapWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  map: { width: "100%", height: height * 0.26 },
  mapOverlay: {
    position: "absolute",
    bottom: 12, left: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  mapOverlayText: {
    fontSize: 11, fontWeight: "700", color: COLORS.text,
  },

  markerWrapper: { alignItems: "center" },
  markerCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.brand,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 3,
    elevation: 4,
  },
  markerText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  markerArrow: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderTopColor: COLORS.brand, marginTop: -2,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },

  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderDateText: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },
  orderAmount: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  orderClient: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  orderCompany: { fontSize: 12, color: COLORS.textMid, fontWeight: "500" },
  orderDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 10 },
  orderBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNote: { fontSize: 12, color: COLORS.textMid, fontWeight: "600" },
  orderPills: { flexDirection: "row", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },

  avgBadge: {
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  avgBadgeText: { fontSize: 11, fontWeight: "800", color: COLORS.brand },

  objectiveCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  objectiveItem: { paddingVertical: 10 },
  objectiveItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  objectiveTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  objectiveLine: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  objectiveTarget: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 1,
  },
  objectivePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  objectivePillText: { fontSize: 11, fontWeight: "800" },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 10,
  },
  emptyDesc: { fontSize: 12, color: COLORS.textMid, marginTop: 2 },
});