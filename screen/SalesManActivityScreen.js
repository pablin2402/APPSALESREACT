import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { API_URL } from "../config";
import {
  useSafeAreaInsets,
  SafeAreaView,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { AuthContext } from "../AuthContext";
import { useNavigation } from "@react-navigation/native";

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

const FILTER_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Visita al cliente", value: "Visita al cliente" },
  { label: "Termina la visita", value: "Termina la visita" },
  { label: "Pedido", value: "Pedido" },
];

export default function SalesManActivityScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, idOwner, salesId } = useContext(AuthContext);

  const [searchTerm, setSearchTerm] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [detailsFilter, setDetailsFilter] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const payload = {
        id_owner: idOwner,
        salesMan: salesId,
        details: detailsFilter,
      };
      if (startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }
      const response = await axios.post(
        API_URL + "/whatsapp/salesman/activity/id",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSalesData(response.data || []);
      setFilteredData(response.data || []);
    } catch (error) {}
  }, [idOwner, salesId, detailsFilter, startDate, endDate, token]);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const filtered = salesData.filter((item) =>
      (item.clientName?.name + " " + item.clientName?.lastName)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, salesData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  };

  const formatDate2 = (date) => {
    if (!date) return "Seleccionar";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getActivityStyle = (details) => {
    if (!details) {
      return {
        bg: COLORS.borderLight,
        color: COLORS.textMid,
        icon: "ellipse-outline",
        label: "Actividad",
      };
    }
    if (details.includes("Termina la visita")) {
      return {
        bg: COLORS.dangerBg,
        color: COLORS.brand,
        icon: "stop-circle",
        label: "Visita finalizada",
      };
    }
    if (details.includes("Visita al cliente")) {
      return {
        bg: COLORS.successBg,
        color: COLORS.success,
        icon: "play-circle",
        label: "Visita iniciada",
      };
    }
    if (details.includes("Pedido")) {
      return {
        bg: COLORS.infoBg,
        color: COLORS.info,
        icon: "bag-check",
        label: "Pedido tomado",
      };
    }
    return {
      bg: COLORS.borderLight,
      color: COLORS.textMid,
      icon: "ellipse",
      label: details,
    };
  };

  const totalActivities = filteredData.length;
  const totalVisits = filteredData.filter((i) =>
    i.details?.includes("Visita al cliente")
  ).length;
  const totalOrders = filteredData.filter((i) =>
    i.details?.includes("Pedido")
  ).length;
  const totalSeconds = filteredData.reduce(
    (s, i) => s + (i.visitDurationSeconds || 0),
    0
  );

  const hasFilters =
    detailsFilter || searchTerm || startDate || endDate;

  const clearFilters = () => {
    setDetailsFilter("");
    setSearchTerm("");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setStartDate(yesterday);
    setEndDate(new Date());
    setTimeout(() => fetchOrders(), 100);
  };

  const groupByDate = (data) => {
    const groups = {};
    data.forEach((item) => {
      const dateKey = formatDate2(item.creationDate);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items }));
  };

  const groupedData = groupByDate(filteredData);

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
                  <Text style={styles.heroTitle}>Mi actividad</Text>
                  <Text style={styles.heroSubtitle}>
                    Historial de visitas y pedidos
                  </Text>
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.infoBg }]}>
                    <Ionicons name="pulse" size={14} color={COLORS.info} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Total</Text>
                    <Text style={styles.kpiValue}>{totalActivities}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.successBg }]}>
                    <Ionicons name="people" size={14} color={COLORS.success} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Visitas</Text>
                    <Text style={styles.kpiValue}>{totalVisits}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningBg }]}>
                    <Ionicons name="time" size={14} color={COLORS.warning} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Tiempo</Text>
                    <Text style={styles.kpiValue} numberOfLines={1}>
                      {totalSeconds > 0 ? formatDuration(totalSeconds) : "0s"}
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
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

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
              onPress={() => fetchOrders()}
              activeOpacity={0.85}
            >
              <Ionicons name="filter" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              themeVariant="light"
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
              display={Platform.OS === "ios" ? "spinner" : "default"}
              themeVariant="light"
              onChange={(event, selectedDate) => {
                setShowEndDatePicker(false);
                if (selectedDate) setEndDate(selectedDate);
              }}
            />
          )}

          <TouchableOpacity
            style={styles.typeSelector}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.typeSelectorLeft}>
              <View style={styles.typeSelectorIcon}>
                <Ionicons name="funnel-outline" size={14} color={COLORS.brand} />
              </View>
              <View>
                <Text style={styles.typeSelectorLabel}>Tipo de actividad</Text>
                <Text style={styles.typeSelectorValue} numberOfLines={1}>
                  {FILTER_OPTIONS.find((o) => o.value === detailsFilter)?.label ||
                    "Todos"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMid} />
          </TouchableOpacity>

          {hasFilters && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={clearFilters}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={14} color={COLORS.textMid} />
              <Text style={styles.clearBtnText}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Filtrar por tipo</Text>

              {FILTER_OPTIONS.map((option) => {
                const isActive = detailsFilter === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.modalOption, isActive && styles.modalOptionActive]}
                    onPress={() => {
                      setDetailsFilter(option.value);
                      setModalVisible(false);
                      setTimeout(() => fetchOrders(), 100);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isActive && styles.modalOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.brand} />
                    )}
                  </TouchableOpacity>
                );
              })}

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

        <FlatList
          data={groupedData}
          keyExtractor={(group) => group.date}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="pulse-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Sin actividad</Text>
              <Text style={styles.emptyDesc}>
                No hay actividades en este período
              </Text>
            </View>
          }
          renderItem={({ item: group }) => (
            <View style={{ marginBottom: 16 }}>
              <View style={styles.groupHeader}>
                <Ionicons name="calendar" size={12} color={COLORS.brand} />
                <Text style={styles.groupHeaderText}>{group.date}</Text>
                <View style={styles.groupCount}>
                  <Text style={styles.groupCountText}>{group.items.length}</Text>
                </View>
              </View>

              {group.items.map((item, idx) => {
                const activity = getActivityStyle(item.details);
                const isLast = idx === group.items.length - 1;
                return (
                  <View key={item._id} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineDot,
                          { backgroundColor: activity.color },
                        ]}
                      >
                        <Ionicons name={activity.icon} size={14} color="#fff" />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    <TouchableOpacity
                      style={styles.activityCard}
                      activeOpacity={0.85}
                    >
                      <View style={styles.activityTop}>
                        <View style={[styles.activityPill, { backgroundColor: activity.bg }]}>
                          <Text
                            style={[
                              styles.activityPillText,
                              { color: activity.color },
                            ]}
                          >
                            {activity.label.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.activityTime}>
                          {formatDate(item.creationDate).split("·")[1]?.trim()}
                        </Text>
                      </View>

                      <Text style={styles.activityClient} numberOfLines={1}>
                        {(
                          item.clientName?.name +
                          " " +
                          item.clientName?.lastName
                        ).toUpperCase()}
                      </Text>

                      {item.location && (
                        <View style={styles.activityLocationRow}>
                          <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                          <Text style={styles.activityLocation} numberOfLines={1}>
                            {item.location}
                          </Text>
                        </View>
                      )}

                      {item.visitDurationSeconds > 0 && (
                        <View style={styles.activityFooter}>
                          <View style={styles.durationChip}>
                            <Ionicons name="time-outline" size={11} color={COLORS.warning} />
                            <Text style={styles.durationText}>
                              {formatDuration(item.visitDurationSeconds)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  heroWrapper: { position: "relative", paddingBottom: 16 },
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
  kpiValue: { fontSize: 14, color: COLORS.text, fontWeight: "800", marginTop: -1 },

  filterBar: { paddingHorizontal: 20, marginTop: 14 },
  searchBox: {
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

  filtersPanel: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  typeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeSelectorLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  typeSelectorIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  typeSelectorLabel: {
    fontSize: 10,
    color: COLORS.textMid,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  typeSelectorValue: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginTop: 1 },

  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
    paddingVertical: 8,
  },
  clearBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.textMid },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOptionActive: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.brand,
  },
  modalOptionText: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  modalOptionTextActive: { color: COLORS.brand },
  modalCloseBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: "center",
  },
  modalCloseBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    flex: 1,
  },
  groupCount: {
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  groupCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.brand,
  },

  timelineRow: { flexDirection: "row", gap: 10, paddingLeft: 4 },
  timelineLeft: { alignItems: "center", width: 30 },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: -2,
  },

  activityCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  activityTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  activityPillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  activityTime: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMid,
    fontVariant: ["tabular-nums"],
  },
  activityClient: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  activityLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  activityLocation: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
  },
  activityFooter: {
    flexDirection: "row",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  durationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  durationText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.warning,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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
});