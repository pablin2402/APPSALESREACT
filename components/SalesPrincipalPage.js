import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { API_URL, GOOGLE_API_KEY } from "../config";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  StatusBar,
  RefreshControl,
  Platform,
  PermissionsAndroid,
  Animated,
  Easing,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { AuthContext } from "../AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
const { height, width } = Dimensions.get("window");

const COLORS = {
  brand: "#D3423E",
  brandDark: "#bb3330",
  brandLight: "#ff6b6b",
  bg: "#ffffff",
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

const getProgressColor = (pct) => {
  if (pct >= 100) return COLORS.success;
  if (pct >= 70) return COLORS.warning;
  return COLORS.brand;
};

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

export default function SalesPrincipalPage() {
  const navigation = useNavigation();
  const { token, idOwner, salesId } = useContext(AuthContext);

  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [route, setRoute] = useState(null);
  const [profile, setProfile] = useState(null);
  const [objectiveData, setObjectiveData] = useState([]);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date();

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

  useFocusEffect(
    React.useCallback(() => {
      onRefresh();
    }, [])
  );

  const fetchProfile = async () => {
    const response = await axios.post(
      API_URL + "/whatsapp/sales/id",
      { id_owner: idOwner, _id: salesId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setProfile(response.data);
  };

  const fetchOrders = async () => {
    const response = await axios.post(
      API_URL + "/whatsapp/order/status",
      { salesId: salesId, orderStatus: "aproved", id_owner: idOwner },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setSalesData(response.data);
    setFilteredData(response.data);
  };

  const startRoute = async () => {
    const response = await axios.post(
      API_URL + "/whatsapp/salesman/route/id",
      {
        salesMan: salesId,
        status: "Por iniciar",
        id_owner: idOwner,
        startDate: getStartOfDayInUTCMinus4(today),
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setRoute(response.data);
  };

  const fetchObjectiveDataRegion = async () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    const response = await axios.post(
      API_URL + "/whatsapp/sales/objective/list",
      { region: "TOTAL CBB", startDate, endDate, salesManId: salesId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setObjectiveData(response.data);
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchProfile(),
        fetchOrders(),
        startRoute(),
        fetchObjectiveDataRegion(),
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
          fetchOrders(),
          startRoute(),
          fetchObjectiveDataRegion(),
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

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(salesData);
    } else {
      const t = searchTerm.toLowerCase();
      setFilteredData(
        salesData.filter(
          (i) =>
            i.id_client.name.toLowerCase().includes(t) ||
            i.id_client.lastName.toLowerCase().includes(t)
        )
      );
    }
  }, [searchTerm, salesData]);

  function getStartOfDayInUTCMinus4(date) {
    const d = new Date(date);
    d.setHours(d.getHours() - 4);
    return d.toISOString();
  }

  const goToClientDetails = (client) =>
    navigation.navigate("OrderDetailsScreen", {
      orderId: client._id,
      products: client.products,
      files: client,
    });

  const navigate = () => navigation.navigate("Map", { screen: "MapScreen" });

  const formatDate = (s) => {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const formatDateLong = (s) => {
    const d = new Date(s);
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
  };

  const totalPedidos = filteredData.length;
  const stopsRuta = route?.[0]?.route?.length || 0;
  const promedioObjetivo =
    objectiveData.length > 0
      ? objectiveData.reduce(
          (s, i) => s + ((i.caja / i.numberOfBoxes) * 100 || 0),
          0
        ) / objectiveData.length
      : 0;

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
          <SafeAreaView
            edges={["top"]}
            style={{ backgroundColor: COLORS.brand }}
          >
            <View style={styles.heroWrapper}>
              <View style={styles.heroBg} />
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
                  <View style={styles.kpiCard}>
                    <View style={[styles.kpiIcon, { backgroundColor: COLORS.successBg }]}>
                      <Ionicons name="trending-up" size={16} color={COLORS.success} />
                    </View>
                    <View>
                      <Text style={styles.kpiLabel}>Avance</Text>
                      <Text style={styles.kpiValue}>
                        {promedioObjetivo.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </SafeAreaView>

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
                  customMapStyle={MAP_STYLE}
                  initialRegion={{
                    latitude: -17.38156252481452,
                    longitude: -66.1613705009222,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                  }}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                >
                  {route?.length > 0 &&
                    route[0].route?.map((point, index) => (
                      <Marker
                        key={index}
                        coordinate={{
                          latitude: parseFloat(point.client_location.latitud),
                          longitude: parseFloat(point.client_location.longitud),
                        }}
                        title={point.name}
                      >
                        <View style={styles.markerWrapper}>
                          <View style={styles.markerCircle}>
                            <Text style={styles.markerText}>{index + 1}</Text>
                          </View>
                          <View style={styles.markerArrow} />
                        </View>
                      </Marker>
                    ))}

                  {route?.length > 0 && route[0].route?.length > 1 && (
                    <MapViewDirections
                      origin={{
                        latitude: parseFloat(route[0].route[0].client_location.latitud || "0"),
                        longitude: parseFloat(route[0].route[0].client_location.longitud || "0"),
                      }}
                      destination={{
                        latitude: parseFloat(
                          route[0].route[route[0].route.length - 1].client_location.latitud
                        ),
                        longitude: parseFloat(
                          route[0].route[route[0].route.length - 1].client_location.longitud
                        ),
                      }}
                      waypoints={route[0].route.slice(1, -1).map((p) => ({
                        latitude: parseFloat(p.client_location.latitud),
                        longitude: parseFloat(p.client_location.longitud),
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
              filteredData.map((item, index) => {
                const orderStatus = getOrderStatusStyle(item.orderStatus);
                const isPagado = item.payStatus === "Pagado";
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.orderCard}
                    onPress={() => goToClientDetails(item)}
                    activeOpacity={0.85}
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
                      {(item.id_client.name + " " + item.id_client.lastName).toUpperCase()}
                    </Text>
                    {item.id_client.company ? (
                      <Text style={styles.orderCompany} numberOfLines={1}>
                        {item.id_client.company}
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
              })
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

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Objetivos del mes</Text>
                <Text style={styles.sectionSubtitle}>
                  Tu avance por línea de producto
                </Text>
              </View>
              <View style={styles.avgBadge}>
                <Text style={styles.avgBadgeText}>
                  {promedioObjetivo.toFixed(0)}% prom.
                </Text>
              </View>
            </View>

            <View style={styles.objectiveCard}>
              {objectiveData.length > 0 ? (
                objectiveData.map((item, index) => {
                  const progress = (item.caja / item.numberOfBoxes) * 100;
                  const color = getProgressColor(progress);
                  const isLast = index === objectiveData.length - 1;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.objectiveItem,
                        !isLast && styles.objectiveItemBorder,
                      ]}
                    >
                      <View style={styles.objectiveTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.objectiveLine} numberOfLines={1}>
                            {item.lyne}
                          </Text>
                          <Text style={styles.objectiveTarget}>
                            Objetivo: {item.numberOfBoxes.toFixed(0)} cajas
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.objectivePill,
                            { backgroundColor: color + "20" },
                          ]}
                        >
                          <Text style={[styles.objectivePillText, { color }]}>
                            {progress.toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(progress, 100)}%`,
                              backgroundColor: color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="flag-outline"
                    size={40}
                    color={COLORS.textLight}
                  />
                  <Text style={styles.emptyTitle}>Sin objetivos</Text>
                  <Text style={styles.emptyDesc}>
                    No tienes objetivos asignados este mes
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  refreshBacker: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: COLORS.brand,
    zIndex: -1,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  heroWrapper: {
    position: "relative",
    paddingBottom: 24,
  },
  heroBg: {
    position: "absolute",
    top: -200,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.brand,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  heroGreeting: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" },
  heroName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroDate: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
    marginBottom: 16,
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
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  kpiLabel: { fontSize: 10, color: COLORS.textMid, fontWeight: "600" },
  kpiValue: { fontSize: 16, color: COLORS.text, fontWeight: "800", marginTop: -1 },

  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 2,
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
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  map: { width: "100%", height: height * 0.26 },
  mapOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },

  markerWrapper: { alignItems: "center" },
  markerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  markerText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.brand,
    marginTop: -2,
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
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderDateText: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },
  orderAmount: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  orderClient: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginBottom: 2 },
  orderCompany: { fontSize: 12, color: COLORS.textMid, fontWeight: "500" },
  orderDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 10,
  },
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
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  objectiveItem: { paddingVertical: 10 },
  objectiveItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  objectiveTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  objectiveLine: {
    fontSize: 14,
    fontWeight: "800",
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
    backgroundColor: "rgba(0,0,0,0.06)",
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
});