import React, { useEffect, useState, useRef, useContext } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { GOOGLE_API_KEY, API_URL } from "../config";
import axios from "axios";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext";
import { INITIAL_ADDRESS, MAP_STYLE } from "../utils/MapUtils";

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

const SkeletonRouteCard = () => (
  <View style={styles.routeCard}>
    <View style={styles.routeCardTop}>
      <ShimmerBlock width={38} height={38} radius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <ShimmerBlock width={130} height={14} radius={5} />
        <ShimmerBlock width={90} height={11} radius={4} />
      </View>
      <ShimmerBlock width={90} height={22} radius={999} />
    </View>
    <ShimmerBlock width="80%" height={13} radius={5} style={{ marginBottom: 12 }} />
    <View style={{ flexDirection: "row", gap: 14, marginBottom: 12 }}>
      <ShimmerBlock width={70} height={11} radius={5} />
      <ShimmerBlock width={70} height={11} radius={5} />
    </View>
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <ShimmerBlock width={60} height={10} radius={4} />
        <ShimmerBlock width={36} height={13} radius={5} />
      </View>
      <ShimmerBlock width="100%" height={6} radius={999} />
    </View>
    <ShimmerBlock width="100%" height={32} radius={10} />
  </View>
);

const MapScreenRoute = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const { token, idOwner, salesId } = useContext(AuthContext);

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });

  const initialEnd = new Date();
  const initialStart = new Date();
  initialStart.setDate(initialStart.getDate() - 7);

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [detailsFilter] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedClient1, setSelectedClient1] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    getUserLocation();
  }, []);

  const fetchRoutes = async (sDate = startDate, eDate = endDate) => {
    setLoading(true);
    try {
      const response = await axios.post(
        API_URL + "/whatsapp/delivery/list/route",
        {
          id_owner: idOwner,
          delivery: salesId,
          startDate: sDate,
          endDate: eDate,
          status: detailsFilter,
          page: 1,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoutes(response.data.data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getUserLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
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
    return current;
  }

  const formatDate2 = (date) => {
    if (!date) return "Seleccionar";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateLong = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const months = [
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString("es-BO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const parseLatLng = (loc) => {
    if (!loc) return null;
    const lat = parseFloat(loc.latitud?.$numberDouble || loc.latitud);
    const lng = parseFloat(loc.longitud?.$numberDouble || loc.longitud);
    if (!lat || !lng) return null;
    return { latitude: lat, longitude: lng };
  };

  const getRouteStats = (route) => {
    if (!route?.route) return { total: 0, visited: 0, progress: 0 };
    const stops = route.route.filter((r) => r.client_location);
    const total = stops.length;
    const visited = stops.filter((r) => r.visitStatus).length;
    const progress = total > 0 ? (visited / total) * 100 : 0;
    return { total, visited, progress };
  };

  const getRouteStatusStyle = (route) => {
    const { progress } = getRouteStats(route);
    if (progress >= 100) {
      return {
        bg: COLORS.successBg,
        color: COLORS.success,
        label: "Completada",
        icon: "checkmark-circle",
      };
    }
    if (progress > 0) {
      return {
        bg: COLORS.warningBg,
        color: COLORS.warning,
        label: "En progreso",
        icon: "time",
      };
    }
    return {
      bg: COLORS.dangerBg,
      color: COLORS.brand,
      label: "Sin iniciar",
      icon: "alert-circle",
    };
  };

  const openRouteDetail = (route) => {
    setSelectedRoute(route);
    setTimeout(() => {
      const points = route.route
        .map((r) => parseLatLng(r.client_location))
        .filter(Boolean);
      if (points.length > 0 && mapRef.current) {
        mapRef.current.fitToCoordinates(points, {
          edgePadding: { top: 140, right: 60, bottom: 280, left: 60 },
          animated: true,
        });
      }
    }, 400);
  };

  const closeRouteDetail = () => {
    setSelectedRoute(null);
  };

  const applyFilter = () => {
    fetchRoutes(startDate, endDate);
    setShowFilters(false);
  };

  const totalRoutes = routes.length;
  const completedRoutes = routes.filter((r) => {
    const { progress } = getRouteStats(r);
    return progress >= 100;
  }).length;

  const listTopPadding = headerHeight > 0 ? headerHeight + 12 : 100;

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {selectedRoute ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            customMapStyle={MAP_STYLE}
            provider={PROVIDER_GOOGLE}
            initialRegion={INITIAL_ADDRESS}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {selectedRoute.route?.map((routeItem, j) => {
              const coord = parseLatLng(routeItem.client_location);
              if (!coord) return null;
              const stopNumber = j + 1;
              const visited = routeItem.visitStatus;
              return (
                <Marker
                  key={`stop-${j}`}
                  coordinate={coord}
                  title={`${routeItem.name} ${routeItem.lastName}`}
                  onPress={() => {
                    setSelectedClient1(routeItem);
                    setModalVisible(true);
                  }}
                >
                  <View style={styles.markerWrapper}>
                    <View
                      style={[
                        styles.markerCircle,
                        visited && { backgroundColor: COLORS.success },
                      ]}
                    >
                      {visited ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : (
                        <Text style={styles.markerText}>{stopNumber}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.markerArrow,
                        visited && { borderTopColor: COLORS.success },
                      ]}
                    />
                  </View>
                </Marker>
              );
            })}

            {(() => {
              const points = (selectedRoute.route || [])
                .map((r) => parseLatLng(r.client_location))
                .filter(Boolean);
              if (points.length > 1) {
                return (
                  <MapViewDirections
                    origin={points[0]}
                    destination={points[points.length - 1]}
                    waypoints={points.slice(1, -1)}
                    apikey={GOOGLE_API_KEY}
                    strokeColor="#111827"
                    strokeWidth={4}
                  />
                );
              }
              return null;
            })()}
          </MapView>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.bg }]} />
        )}

        <SafeAreaView
          edges={["top"]}
          style={styles.topHeaderSafe}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.topHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (selectedRoute) {
                  closeRouteDetail();
                } else {
                  navigation.goBack();
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.text} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {selectedRoute ? "Detalle de ruta" : "Historial de rutas"}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {selectedRoute
                  ? formatDateLong(selectedRoute.startDate)
                  : `${totalRoutes} ${totalRoutes === 1 ? "ruta" : "rutas"} · ${completedRoutes} completadas`}
              </Text>
            </View>

            {!selectedRoute && (
              <TouchableOpacity
                style={[
                  styles.filterToggle,
                  showFilters && styles.filterToggleActive,
                ]}
                onPress={() => setShowFilters(!showFilters)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="calendar"
                  size={16}
                  color={showFilters ? "#fff" : COLORS.brand}
                />
              </TouchableOpacity>
            )}
          </View>

          {showFilters && !selectedRoute && (
            <View style={styles.filtersPanel}>
              <Text style={styles.filterLabel}>Rango de fechas</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  onPress={() => setShowStartDatePicker(true)}
                  style={styles.dateInput}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={14} color={COLORS.brand} />
                  <Text style={styles.dateInputText}>{formatDate2(startDate)}</Text>
                </TouchableOpacity>

                <View style={styles.dateArrow}>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.textLight} />
                </View>

                <TouchableOpacity
                  onPress={() => setShowEndDatePicker(true)}
                  style={styles.dateInput}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={14} color={COLORS.brand} />
                  <Text style={styles.dateInputText}>{formatDate2(endDate)}</Text>
                </TouchableOpacity>
              </View>

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  themeVariant="light"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(false);
                    if (selectedDate) setStartDate(selectedDate);
                  }}
                />
              )}

              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  themeVariant="light"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(false);
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={applyFilter}
                activeOpacity={0.9}
              >
                <Ionicons name="filter" size={14} color="#fff" />
                <Text style={styles.applyBtnText}>Aplicar filtros</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>

        {!selectedRoute && (
          <View style={styles.listWrapper}>
            {loading ? (
              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: listTopPadding,
                  paddingBottom: insets.bottom + 24,
                }}
                showsVerticalScrollIndicator={false}
              >
                <SkeletonRouteCard />
                <SkeletonRouteCard />
                <SkeletonRouteCard />
                <SkeletonRouteCard />
              </ScrollView>
            ) : routes.length === 0 ? (
              <View style={[styles.emptyState, { paddingTop: listTopPadding + 40 }]}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="map-outline" size={36} color={COLORS.textLight} />
                </View>
                <Text style={styles.emptyTitle}>Sin rutas</Text>
                <Text style={styles.emptyDesc}>
                  No hay rutas en el rango de fechas seleccionado
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: listTopPadding,
                  paddingBottom: insets.bottom + 24,
                }}
                showsVerticalScrollIndicator={false}
              >
                {routes.map((route, index) => {
                  const { total, visited, progress } = getRouteStats(route);
                  const status = getRouteStatusStyle(route);
                  return (
                    <TouchableOpacity
                      key={route._id || index}
                      style={styles.routeCard}
                      onPress={() => openRouteDetail(route)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.routeCardTop}>
                        <View style={styles.routeIconBox}>
                          <Ionicons name="map" size={18} color={COLORS.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.routeCardDate}>
                            {formatDateLong(route.startDate)}
                          </Text>
                          <Text style={styles.routeCardTime}>
                            Inicio · {formatTime(route.startDate)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.routeStatusPill,
                            { backgroundColor: status.bg },
                          ]}
                        >
                          <Ionicons
                            name={status.icon}
                            size={11}
                            color={status.color}
                          />
                          <Text
                            style={[
                              styles.routeStatusText,
                              { color: status.color },
                            ]}
                          >
                            {status.label}
                          </Text>
                        </View>
                      </View>

                      {route.details && (
                        <Text style={styles.routeCardTitle} numberOfLines={2}>
                          {route.details}
                        </Text>
                      )}

                      <View style={styles.routeCardMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="location" size={11} color={COLORS.textMid} />
                          <Text style={styles.metaText}>
                            {total} {total === 1 ? "parada" : "paradas"}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons
                            name="checkmark-done"
                            size={11}
                            color={COLORS.success}
                          />
                          <Text style={styles.metaText}>
                            {visited} visitadas
                          </Text>
                        </View>
                      </View>

                      <View style={styles.routeProgressSection}>
                        <View style={styles.routeProgressTop}>
                          <Text style={styles.routeProgressLabel}>Progreso</Text>
                          <Text
                            style={[
                              styles.routeProgressPct,
                              { color: status.color },
                            ]}
                          >
                            {progress.toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.routeProgressTrack}>
                          <View
                            style={[
                              styles.routeProgressFill,
                              {
                                width: `${Math.min(progress, 100)}%`,
                                backgroundColor: status.color,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      <View style={styles.routeCardCta}>
                        <Text style={styles.routeCardCtaText}>Ver en mapa</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color={COLORS.brand}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {selectedRoute && (
          <View style={[styles.progressBar, { bottom: insets.bottom + 20 }]}>
            <View style={styles.progressTop}>
              <View style={styles.progressLeft}>
                <View style={styles.progressIconBox}>
                  <Ionicons name="map" size={16} color={COLORS.brand} />
                </View>
                <View>
                  <Text style={styles.progressLabel}>Progreso de ruta</Text>
                  <Text style={styles.progressValue}>
                    {getRouteStats(selectedRoute).visited} de{" "}
                    {getRouteStats(selectedRoute).total} visitadas
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.progressPill,
                  {
                    backgroundColor:
                      getRouteStats(selectedRoute).progress >= 100
                        ? COLORS.successBg
                        : COLORS.dangerBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.progressPillText,
                    {
                      color:
                        getRouteStats(selectedRoute).progress >= 100
                          ? COLORS.success
                          : COLORS.brand,
                    },
                  ]}
                >
                  {getRouteStats(selectedRoute).progress.toFixed(0)}%
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(getRouteStats(selectedRoute).progress, 100)}%`,
                    backgroundColor:
                      getRouteStats(selectedRoute).progress >= 100
                        ? COLORS.success
                        : COLORS.brand,
                  },
                ]}
              />
            </View>
            {selectedRoute.details && (
              <View style={styles.progressDetails}>
                <Ionicons
                  name="document-text-outline"
                  size={11}
                  color={COLORS.textMid}
                />
                <Text style={styles.progressDetailsText} numberOfLines={2}>
                  {selectedRoute.details}
                </Text>
              </View>
            )}
          </View>
        )}

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalAvatar}>
                  {selectedClient1?.identificationImage ? (
                    <Image
                      source={{ uri: selectedClient1.identificationImage }}
                      style={styles.modalAvatarImg}
                    />
                  ) : (
                    <Text style={styles.modalAvatarText}>
                      {selectedClient1?.name?.[0]?.toUpperCase()}
                      {selectedClient1?.lastName?.[0]?.toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalClientName} numberOfLines={1}>
                    {selectedClient1?.name} {selectedClient1?.lastName}
                  </Text>
                  {selectedClient1?.client_location?.sucursalName && (
                    <Text style={styles.modalSucursal} numberOfLines={1}>
                      {selectedClient1.client_location.sucursalName}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.modalCloseIcon}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={18} color={COLORS.textMid} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: selectedClient1?.visitStatus
                      ? COLORS.successBg
                      : COLORS.dangerBg,
                  },
                ]}
              >
                <Ionicons
                  name={
                    selectedClient1?.visitStatus
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={12}
                  color={
                    selectedClient1?.visitStatus ? COLORS.success : COLORS.brand
                  }
                />
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: selectedClient1?.visitStatus
                        ? COLORS.success
                        : COLORS.brand,
                    },
                  ]}
                >
                  {selectedClient1?.visitStatus ? "VISITADO" : "SIN VISITAR"}
                </Text>
              </View>

              {selectedClient1?.identificationImage && (
                <View style={styles.modalImageWrapper}>
                  <Image
                    source={{ uri: selectedClient1.identificationImage }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: COLORS.warningBg }]}>
                  <Ionicons name="location" size={14} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {selectedClient1?.client_location?.direction || "No disponible"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: COLORS.infoBg }]}>
                  <Ionicons name="time" size={14} color={COLORS.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Tiempo de visita</Text>
                  <Text style={styles.infoValue}>
                    {selectedClient1?.visitTime || "No registrado"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.modalCloseBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

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
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 2,
  },
  filterToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  filterToggleActive: {
    backgroundColor: COLORS.brand,
  },

  filtersPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  dateInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInputText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  dateArrow: { paddingHorizontal: 2 },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
  },
  applyBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  listWrapper: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: "500",
    textAlign: "center",
  },

  routeCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  routeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  routeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  routeCardDate: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    textTransform: "capitalize",
  },
  routeCardTime: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "600",
    marginTop: 1,
  },
  routeStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  routeStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  routeCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
    lineHeight: 17,
  },
  routeCardMeta: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "700",
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
    fontWeight: "800",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  routeProgressPct: { fontSize: 13, fontWeight: "800" },
  routeProgressTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  routeProgressFill: { height: "100%", borderRadius: 999 },

  routeCardCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
  },
  routeCardCtaText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.3,
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

  progressBar: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 1,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  progressPillText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  progressDetails: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  progressDetailsText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    lineHeight: 15,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 12,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  modalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  modalAvatarImg: { width: "100%", height: "100%" },
  modalAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.5,
  },
  modalClientName: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  modalSucursal: {
    fontSize: 12,
    color: COLORS.textMid,
    fontWeight: "600",
    marginTop: 2,
  },
  modalCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },

  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  statusPillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },

  modalImageWrapper: {
    width: "100%",
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: COLORS.borderLight,
  },
  modalImage: { width: "100%", height: "100%" },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
    lineHeight: 17,
  },

  modalCloseBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  modalCloseBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

export default MapScreenRoute;