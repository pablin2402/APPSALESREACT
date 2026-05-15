import React, { useEffect, useState, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { API_URL } from "../config";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { AuthContext } from "../AuthContext";

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

export default function SalesInformScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, idOwner, salesId } = useContext(AuthContext);

  const [salesData, setSalesData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  const [itemsPerPage] = useState(10);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const range = 2;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const formatDate2 = (date) => {
    if (!date) return "Seleccionar";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  function utcToLocalDateString(utcDateStr, timeZone = "America/La_Paz") {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(utcDateStr);
  }

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const payload = {
        id_owner: idOwner,
        salesId: salesId,
        page: page,
        limit: itemsPerPage,
      };
      if (startDate && endDate) {
        payload.startDate = utcToLocalDateString(startDate);
        payload.endDate = utcToLocalDateString(endDate);
      }
      if (searchTerm) payload.fullName = searchTerm;
      if (selectedStatus && selectedStatus !== "Todos") {
        payload.payStatus = selectedStatus;
      }
      const response = await axios.post(API_URL + "/whatsapp/order/sales/id", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalesData(response.data.orders || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  };

  const goToClientDetails = (client) => {
    navigation.navigate("OrderDetailsScreen", {
      orderId: client._id,
      products: client.products,
      files: client,
    });
  };

  const getOrderStatusStyle = (status) => {
    switch (status) {
      case "aproved":
        return { bg: COLORS.successBg, text: COLORS.success, label: "Aprobado", icon: "checkmark-circle" };
      case "En Ruta":
        return { bg: COLORS.infoBg, text: COLORS.info, label: "En Ruta", icon: "car" };
      case "cancelled":
        return { bg: COLORS.dangerBg, text: COLORS.danger, label: "Cancelado", icon: "close-circle" };
      case "created":
        return { bg: COLORS.warningBg, text: COLORS.warning, label: "Creado", icon: "ellipse" };
      default:
        return { bg: COLORS.borderLight, text: COLORS.textMid, label: "Desconocido", icon: "help-circle" };
    }
  };

  const totalOrders = salesData.length;
  const totalAmount = salesData.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const paidOrders = salesData.filter((o) => o.payStatus === "Pagado").length;

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedStatus("Todos");
    setSearchTerm("");
    fetchProducts();
  };

  const hasActiveFilters =
    startDate || endDate || (selectedStatus && selectedStatus !== "Todos") || searchTerm;

  if (loading && salesData.length === 0) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingFull}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Cargando informe...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
                  <Text style={styles.heroTitle}>Mis ventas</Text>
                  <Text style={styles.heroSubtitle}>
                    Historial de pedidos realizados
                  </Text>
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.infoBg }]}>
                    <Ionicons name="receipt-outline" size={14} color={COLORS.info} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Pedidos</Text>
                    <Text style={styles.kpiValue}>{totalOrders}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.successBg }]}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Pagados</Text>
                    <Text style={styles.kpiValue}>{paidOrders}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningBg }]}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.warning} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Total</Text>
                    <Text style={styles.kpiValue} numberOfLines={1}>
                      Bs. {totalAmount.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMid} />
            <TextInput
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
              placeholderTextColor={COLORS.textLight}
              returnKeyType="search"
              onSubmitEditing={() => {
                setPage(1);
                fetchProducts();
              }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterToggle,
              (showFilters || hasActiveFilters) && styles.filterToggleActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={showFilters || hasActiveFilters ? "#fff" : COLORS.brand}
            />
            {hasActiveFilters && !showFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
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
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
            )}

            <Text style={[styles.filterLabel, { marginTop: 14 }]}>Estado de pago</Text>
            <View style={styles.chipsRow}>
              {["Todos", "Pagado", "Pendiente"].map((status) => {
                const isActive = selectedStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusChip, isActive && styles.statusChipActive]}
                    onPress={() => setSelectedStatus(status)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isActive && styles.statusChipTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={clearFilters}
                activeOpacity={0.85}
              >
                <Text style={styles.clearBtnText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setPage(1);
                  fetchProducts();
                  setShowFilters(false);
                }}
                activeOpacity={0.9}
              >
                <Ionicons name="filter" size={14} color="#fff" />
                <Text style={styles.applyBtnText}>Aplicar filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <FlatList
          data={salesData}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Sin pedidos</Text>
              <Text style={styles.emptyDesc}>
                No encontramos pedidos con estos filtros
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const orderStatus = getOrderStatusStyle(item.orderStatus);
            const isPagado = item.payStatus === "Pagado";
            return (
              <TouchableOpacity
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

                <View style={styles.orderMiddle}>
                  <View style={styles.orderAvatar}>
                    <Text style={styles.orderAvatarText}>
                      {item.id_client?.name?.[0]?.toUpperCase()}
                      {item.id_client?.lastName?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderClient} numberOfLines={1}>
                      {(item.id_client.name + " " + item.id_client.lastName).toUpperCase()}
                    </Text>
                    <Text style={styles.orderNote}>Nota #{item.receiveNumber}</Text>
                  </View>
                </View>

                <View style={styles.orderDivider} />

                <View style={styles.orderBottom}>
                  <View style={[styles.pill, { backgroundColor: orderStatus.bg }]}>
                    <Ionicons name={orderStatus.icon} size={11} color={orderStatus.text} />
                    <Text style={[styles.pillText, { color: orderStatus.text }]}>
                      {orderStatus.label.toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isPagado ? COLORS.successBg : COLORS.dangerBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isPagado ? "checkmark-circle" : "alert-circle"}
                      size={11}
                      color={isPagado ? COLORS.success : COLORS.brand}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        { color: isPagado ? COLORS.success : COLORS.brand },
                      ]}
                    >
                      {isPagado ? "PAGADO" : "PENDIENTE"}
                    </Text>
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
  loadingText: {
    marginTop: 12,
    color: COLORS.textMid,
    fontSize: 13,
    fontWeight: "500",
  },

  heroWrapper: { position: "relative", paddingBottom: 20 },
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
  heroContent: { paddingHorizontal: 20, paddingTop: 8 },
  heroTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
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
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
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

  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  filterToggle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterToggleActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },

  filtersPanel: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
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

  chipsRow: { flexDirection: "row", gap: 6 },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  statusChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  statusChipText: { fontSize: 12, fontWeight: "700", color: COLORS.textMid },
  statusChipTextActive: { color: "#fff" },

  filterActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  clearBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.textMid },
  applyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
  },
  applyBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

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
    alignItems: "center",
    gap: 10,
  },
  orderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  orderAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.5,
  },
  orderClient: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginBottom: 1 },
  orderNote: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },

  orderDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 10,
  },

  orderBottom: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 12, color: COLORS.textMid, marginTop: 4, textAlign: "center" },

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