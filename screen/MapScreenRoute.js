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
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { GOOGLE_API_KEY, API_URL } from "../config";
import axios from "axios";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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

const MapScreenRoute = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const { token, idOwner, salesId } = useContext(AuthContext);

  const [clients, setClients] = useState([]);
  const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [detailsFilter] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedClient1, setSelectedClient1] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getUserLocation();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.post(
        API_URL + "/whatsapp/salesman/list/route",
        {
          id_owner: idOwner,
          salesMan: salesId,
          startDate: startDate,
          endDate: endDate,
          status: detailsFilter,
          page: 1,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClients(response.data.data || []);
    } catch (error) {}
  };

  const filterDataBySearchTerm = () => {
    const filtered = clients.filter((item) =>
      (item.clientName?.name + " " + item.clientName?.lastName)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
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
    filterDataBySearchTerm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, clients]);

  async function getUserLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permisos denegados");
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

  const formatDate2 = (date) => {
    if (!date) return "Seleccionar";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const allRoutePoints = clients.flatMap((client) =>
    client.route
      .filter((r) => r.client_location)
      .map((r) => {
        const lat = parseFloat(
          r.client_location.latitud?.$numberDouble || r.client_location.latitud
        );
        const lng = parseFloat(
          r.client_location.longitud?.$numberDouble || r.client_location.longitud
        );
        return { latitude: lat, longitude: lng };
      })
  );

  const totalStops = allRoutePoints.length;
  const visitedStops = clients.reduce(
    (s, c) => s + (c.route?.filter((r) => r.visitStatus).length || 0),
    0
  );
  const progress = totalStops > 0 ? (visitedStops / totalStops) * 100 : 0;

  return (
    <SafeAreaProvider>
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
          {clients.map((client, i) =>
            client.route.map((routeItem, j) => {
              const lat = parseFloat(
                routeItem.client_location?.latitud?.$numberDouble ||
                  routeItem.client_location?.latitud
              );
              const lng = parseFloat(
                routeItem.client_location?.longitud?.$numberDouble ||
                  routeItem.client_location?.longitud
              );
              if (!lat || !lng) return null;

              const stopNumber = j + 1;
              const visited = routeItem.visitStatus;

              return (
                <Marker
                  key={`${i}-${j}`}
                  coordinate={{ latitude: lat, longitude: lng }}
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
            })
          )}

          {allRoutePoints.length > 1 && (
            <MapViewDirections
              origin={allRoutePoints[0]}
              destination={allRoutePoints[allRoutePoints.length - 1]}
              waypoints={allRoutePoints.slice(1, -1)}
              apikey={GOOGLE_API_KEY}
              strokeColor="#111827"
              strokeWidth={4}
            />
          )}
        </MapView>

        <SafeAreaView edges={["top"]} style={styles.topHeaderSafe}>
          <View style={styles.topHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.text} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Historial de rutas
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {visitedStops}/{totalStops} paradas visitadas
              </Text>
            </View>

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
          </View>

          {showFilters && (
            <View style={styles.filtersPanel}>
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

                <TouchableOpacity
                  style={styles.filterApplyBtn}
                  onPress={() => {
                    fetchClients();
                    setShowFilters(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="filter" size={16} color="#fff" />
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
            </View>
          )}
        </SafeAreaView>

        {totalStops > 0 && (
          <View style={[styles.progressBar, { bottom: insets.bottom + 20 }]}>
            <View style={styles.progressTop}>
              <View style={styles.progressLeft}>
                <View style={styles.progressIconBox}>
                  <Ionicons name="map" size={16} color={COLORS.brand} />
                </View>
                <View>
                  <Text style={styles.progressLabel}>Progreso de ruta</Text>
                  <Text style={styles.progressValue}>
                    {visitedStops} de {totalStops} visitadas
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.progressPill,
                  {
                    backgroundColor:
                      progress >= 100 ? COLORS.successBg : COLORS.dangerBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.progressPillText,
                    {
                      color: progress >= 100 ? COLORS.success : COLORS.brand,
                    },
                  ]}
                >
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
                    backgroundColor:
                      progress >= 100 ? COLORS.success : COLORS.brand,
                  },
                ]}
              />
            </View>
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
  container: { flex: 1 },

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
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  filterApplyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
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