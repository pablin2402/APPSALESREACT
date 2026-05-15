import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import axios from "axios";
import { API_URL } from "../config";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute, useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";

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

export default function ClientDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, idOwner } = useContext(AuthContext);

  const clientId = route.params?.client;

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const range = 2;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const fetchClientData = useCallback(async () => {
    try {
      const response = await axios.post(
        API_URL + "/whatsapp/client/info/id",
        { _id: clientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClient(response.data[0]);
    } catch (error) {
      console.error("Error al obtener los datos del cliente", error);
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const fetchSalesData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        API_URL + "/whatsapp/order/id/user",
        {
          id_owner: idOwner,
          id_client: clientId,
          page: page,
          limit: 5,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSalesData(response.data.orders || []);
      setFilteredData(response.data.orders || []);
      setTotalPages(parseInt(response.data.totalPages || 1));
    } catch (error) {
      console.error("Error al obtener las ventas", error);
    } finally {
      setLoading(false);
    }
  }, [clientId, page, idOwner, token]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filterData = () => {
    let filtered = salesData;
    if (startDate && endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.creationDate);
        return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
      });
    }
    setFilteredData(filtered);
    setShowFilters(false);
  };

  const handleRowClick = (item) => {
    navigation.navigate("OrderDetailsScreen", {
      products: item.products,
      files: item,
      orderId: item._id,
    });
  };

  if (!client) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingFull}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Cargando cliente...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const getInitials = (name, lastName) => {
    return `${name?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const totalOrders = filteredData.length;
  const paidOrders = filteredData.filter(
    (o) => o.payStatus === "Pagado"
  ).length;
  const totalAmount = filteredData.reduce(
    (s, o) => s + (Number(o.totalAmount) || 0),
    0
  );

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
      <View style={styles.container}>
        <View style={styles.heroWrapper}>
          <View style={styles.heroBg} />
          <SafeAreaView edges={["top"]}>
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Detalle del cliente</Text>
                  <Text style={styles.heroSubtitle}>
                    Historial de pedidos
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
                    color={showFilters ? COLORS.brand : "#fff"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatarWrapper}>
                  {client.identificationImage ? (
                    <Image
                      source={{ uri: client.identificationImage }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>
                        {getInitials(client.name, client.lastName)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.avatarStatusDot} />
                </View>

                <Text style={styles.clientName}>
                  {client.name} {client.lastName}
                </Text>

                {client.company && (
                  <View style={styles.companyChip}>
                    <Ionicons name="business" size={11} color={COLORS.brand} />
                    <Text style={styles.companyChipText}>{client.company}</Text>
                  </View>
                )}

                <View style={styles.profileDivider} />

                <View style={styles.profileInfoRow}>
                  <View style={[styles.profileInfoIcon, { backgroundColor: COLORS.warningBg }]}>
                    <Ionicons name="location" size={14} color={COLORS.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileInfoLabel}>Dirección</Text>
                    <Text style={styles.profileInfoValue} numberOfLines={2}>
                      {client.client_location?.direction || "No disponible"}
                    </Text>
                  </View>
                </View>

                {client.phoneNumber && (
                  <View style={[styles.profileInfoRow, { marginTop: 8 }]}>
                    <View style={[styles.profileInfoIcon, { backgroundColor: COLORS.successBg }]}>
                      <Ionicons name="call" size={14} color={COLORS.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileInfoLabel}>Teléfono</Text>
                      <Text style={styles.profileInfoValue}>
                        {client.phoneNumber}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.infoBg }]}>
                    <Ionicons name="bag-handle" size={14} color={COLORS.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kpiLabel}>Pedidos</Text>
                    <Text style={styles.kpiValue}>{totalOrders}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.successBg }]}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kpiLabel}>Pagados</Text>
                    <Text style={styles.kpiValue}>{paidOrders}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningBg }]}>
                    <Ionicons name="cash" size={14} color={COLORS.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kpiLabel}>Monto</Text>
                    <Text style={styles.kpiValue} numberOfLines={1}>
                      Bs. {totalAmount.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>

              {showFilters && (
                <View style={styles.filtersPanel}>
                  <Text style={styles.filterLabel}>Rango de fechas</Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      onPress={() => setShowStartDatePicker(true)}
                      style={styles.dateInput}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={14} color={COLORS.brand} />
                      <Text style={styles.dateInputText}>
                        {formatDate(startDate)}
                      </Text>
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
                      <Text style={styles.dateInputText}>{formatDate(endDate)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.filterApplyBtn}
                      onPress={filterData}
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

              <Text style={styles.sectionTitle}>
                Pedidos {filteredData.length > 0 && `(${filteredData.length})`}
              </Text>
            </>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loaderInline}>
                <ActivityIndicator size="large" color={COLORS.brand} />
                <Text style={styles.loadingText}>Cargando pedidos...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="bag-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Sin pedidos</Text>
                <Text style={styles.emptyDesc}>
                  Este cliente aún no tiene pedidos registrados
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const isPaid = item.payStatus === "Pagado";
            return (
              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => handleRowClick(item)}
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

                <View style={styles.orderMiddle}>
                  <View style={styles.orderNumberBox}>
                    <Ionicons name="receipt" size={14} color={COLORS.brand} />
                    <Text style={styles.orderNumberText}>
                      Nota #{item.receiveNumber}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isPaid
                          ? COLORS.successBg
                          : COLORS.dangerBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isPaid ? "checkmark-circle" : "time"}
                      size={10}
                      color={isPaid ? COLORS.success : COLORS.brand}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isPaid ? COLORS.success : COLORS.brand },
                      ]}
                    >
                      {(item.payStatus || "—").toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderProducts}>
                    {item.products?.length || 0}{" "}
                    {item.products?.length === 1 ? "producto" : "productos"}
                  </Text>
                  <View style={styles.orderChevron}>
                    <Text style={styles.orderChevronText}>Ver detalle</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.brand} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  style={[styles.pageNavBtn, page === 1 && styles.pageNavBtnDisabled]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={page === 1 ? COLORS.textLight : COLORS.brand}
                  />
                </TouchableOpacity>

                {pagesToShow.map((num) => (
                  <TouchableOpacity
                    key={num}
                    onPress={() => setPage(num)}
                    style={[styles.pageBtn, page === num && styles.pageBtnActive]}
                  >
                    <Text
                      style={page === num ? styles.pageTextActive : styles.pageText}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  style={[
                    styles.pageNavBtn,
                    page === totalPages && styles.pageNavBtnDisabled,
                  ]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={page === totalPages ? COLORS.textLight : COLORS.brand}
                  />
                </TouchableOpacity>
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loaderInline: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMid,
    fontSize: 13,
    fontWeight: "500",
  },

  heroWrapper: { position: "relative", paddingBottom: 10 },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.brand,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterToggleActive: { backgroundColor: "#fff" },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop:20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  avatarWrapper: { position: "relative", marginBottom: 10 },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 1,
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: "#fff",
  },
  clientName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  companyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  companyChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  profileDivider: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 14,
  },
  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  profileInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  profileInfoValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 16,
  },

  kpiRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  kpiLabel: { fontSize: 10, color: COLORS.textMid, fontWeight: "600" },
  kpiValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "800",
    marginTop: -1,
  },

  filtersPanel: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
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

  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textMid,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    marginBottom: 10,
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
  orderDateText: { fontSize: 10, color: COLORS.textMid, fontWeight: "600" },
  orderAmount: { fontSize: 17, fontWeight: "800", color: COLORS.text },

  orderMiddle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderNumberBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderNumberText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },

  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  orderProducts: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "600",
  },
  orderChevron: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  orderChevronText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.brand,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textMid,
    marginTop: 4,
    textAlign: "center",
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pageNavBtnDisabled: { opacity: 0.5 },
  pageBtn: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pageBtnActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  pageText: { fontSize: 13, fontWeight: "700", color: COLORS.textMid },
  pageTextActive: { fontSize: 13, fontWeight: "800", color: "#fff" },
});