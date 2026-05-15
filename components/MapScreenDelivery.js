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
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import { GOOGLE_API_KEY } from "../config";

import axios from "axios";
import { API_URL } from "../config";

import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";

import { FontAwesome } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext";
const { height } = Dimensions.get("window");

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

const MapScreenDelivery = () => {

  const [clients, setClients] = useState([]);
  const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });
  const mapRef = useRef(null);
  const [filteredData, setFilteredData] = useState([]);
  const [routeId, setRouteId] = useState("");
  const [route, setRoute] = useState(null);

  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedClient1, setSelectedClient1] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

  const { token, idOwner, salesId } = useContext(AuthContext);

  const getRoutesById = async (value) => {
    try {
      console.log(value, idOwner)
      const response = await axios.post(
        API_URL + "/whatsapp/delivery/list/route/id",
        {
          _id: value,
          id_owner: idOwner,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        response.status === 200 &&
        response.data.length > 0 &&
        response.data[0].route.length > 1
      ) {
        setRoute(response.data);
        setShowRoute(true);
      } else {
        console.warn("La ruta está vacía o incompleta.");
      }
    } catch (error) {
      console.error("Error al obtener la ruta:", error);
    }
  };


  useEffect(() => {
    getUserLocation()
  }, [])
  const fetchClients = async () => {
    try {
      const response = await axios.post(API_URL + "/whatsapp/delivery/list/route", {
        id_owner: idOwner,
        startDate: startDate,
        endDate: endDate,
        delivery: salesId,
        page: 1,
        excludeComplete: false,
        status: "Finalizado",
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setClients(response.data.data || []);
    } catch (error) {
    } finally {
    }
  };
  const filterDataBySearchTerm = () => {
    const filtered = clients.filter(item =>
      (item.clientName?.name + " " + item.clientName?.lastName).toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  };
  useEffect(() => {
    fetchClients();
  }, []);
  useEffect(() => {
    filterDataBySearchTerm();
  }, [searchTerm, clients]);
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
  };
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
  const formatDate2 = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

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
          route?.length > 0 &&
          route[0].route?.map((point, index) => {
            const isCurrentClient =
              isTimerRunning &&
              selectedClient?.client_location._id === point.client_location._id;

            return (
              <React.Fragment key={index}>
                <Marker
                  key={index}
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
                        point.visitStatus && { backgroundColor: COLORS.success },
                        isCurrentClient && { backgroundColor: COLORS.info },
                      ]}
                    >
                      {point.visitStatus ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : isCurrentClient ? (
                        <Ionicons name="navigate" size={12} color="#fff" />
                      ) : (
                        <Text style={styles.markerText}>{index + 1}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.markerArrow,
                        point.visitStatus && { borderTopColor: COLORS.success },
                        isCurrentClient && { borderTopColor: COLORS.info },
                      ]}
                    />
                  </View>
                </Marker>
                {index === 0 && route[0].route.length > 1 && (
                  <MapViewDirections
                    origin={origin}
                    destination={{
                      latitude: parseFloat(
                        route[0].route[route[0].route.length - 1].client_location.latitud
                      ),
                      longitude: parseFloat(
                        route[0].route[route[0].route.length - 1].client_location.longitud
                      ),
                    }}
                    waypoints={route[0].route.slice(0, -1).map((point) => ({
                      latitude: parseFloat(point.client_location.latitud),
                      longitude: parseFloat(point.client_location.longitud),
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
      </MapView>

      <SafeAreaView edges={["top"]} style={styles.topHeaderSafe}>
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

          {isTimerRunning && (
            <View style={styles.timerBadge}>
              <View style={styles.timerDot} />
              <Text style={styles.timerText}>{formatTime(timer)}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {showClients && !showRoute && !showRoutes && (
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

      {showClients && !showRoute && !showRoutes && filteredClients.length > 0 && (
        <View style={styles.cardsWrapper}>
          <View style={styles.cardsHeaderRow}>
            <Text style={styles.cardsHeaderTitle}>Cerca de ti</Text>
            <TouchableOpacity onPress={() => showRoutesList()}>
              <Text style={styles.cardsHeaderLink}>Ver rutas →</Text>
            </TouchableOpacity>
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
                    onPress={() => {
                      setRouteId(item._id);
                      getRoutesById(item._id);
                      startMapping();
                    }}
                    activeOpacity={0.85}
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
                      <Text style={styles.routeCtaText}>Iniciar ruta</Text>
                      <Ionicons name="arrow-forward" size={14} color="#fff" />
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

      {showRoute && route?.length > 0 && !isTimerRunning && (
        <View style={styles.cardsWrapper}>
          <View style={styles.cardsHeaderRow}>
            <Text style={styles.cardsHeaderTitle}>Paradas de la ruta</Text>
            <Text style={styles.cardsHeaderCount}>
              {route[0].route?.filter((p) => p.visitStatus).length}/
              {route[0].route?.length}
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
            {route[0].route?.map((item, index) => {
              const visited = item.visitStatus;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.deliveryCard,
                    visited && { borderWidth: 2, borderColor: COLORS.success },
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
                    <View style={styles.stopNumberBadge}>
                      <Text style={styles.stopNumberText}>{index + 1}</Text>
                    </View>
                    <View
                      style={[
                        styles.imageBadge,
                        visited
                          ? { backgroundColor: COLORS.success }
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
                      ) : (
                        <>
                          <View
                            style={[styles.imageBadgeDot, { backgroundColor: COLORS.warning }]}
                          />
                          <Text
                            style={[styles.imageBadgeText, { color: COLORS.warning }]}
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
                      <View style={styles.metaChip}>
                        <Ionicons name="flag-outline" size={10} color={COLORS.textMid} />
                        <Text style={styles.metaChipText}>Parada {index + 1}</Text>
                      </View>
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
            {selectedClient.visitStatus ? (
              <View style={styles.sheetStat}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.sheetStatText}>Ya visitado</Text>
              </View>
            ) : (
              <View style={[styles.sheetStat, { backgroundColor: COLORS.infoBg }]}>
                <Ionicons name="person" size={12} color={COLORS.info} />
                <Text style={[styles.sheetStatText, { color: COLORS.info }]}>
                  Cliente activo
                </Text>
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
          </View>

          {!isTimerRunning && !selectedClient.visitStatus && (
            <TouchableOpacity
              style={styles.startVisitButton}
              onPress={() => handleTimerToggle(selectedClient, "Visita al cliente")}
              disabled={loadingButton}
              activeOpacity={0.9}
            >
              {loadingButton ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.startVisitText}>Iniciar visita</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isTimerRunning && (
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.orderButton}
                onPress={navigate}
                activeOpacity={0.9}
              >
                <Ionicons name="bag-outline" size={16} color={COLORS.brand} />
                <Text style={styles.orderButtonText}>Tomar pedido</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.finishVisitButton}
                onPress={() => handleTimerToggle(selectedClient, "Termina la visita")}
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

      {loading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        </View>
      )}
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
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.warning,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.warning,
    fontVariant: ["tabular-nums"],
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
  cardsHeaderLink: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.brand,
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
  sheetStatsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
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

  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  loadingCard: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMid,
  },
});
export default MapScreenDelivery;
