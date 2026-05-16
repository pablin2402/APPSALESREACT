import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Animated,
  LayoutAnimation,
  UIManager,
  Easing,
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
import { AuthContext } from "../AuthContext";
import { useNavigation } from "@react-navigation/native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  brand: "#D3423E",
  brandDark: "#bb3330",
  bg: "#f9fafb",
  card: "#ffffff",
  cardSoft: "#f3f4f6",
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

const ShimmerBlock = ({ width, height, style, radius = 8 }) => {
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
          width,
          height,
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

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonTop}>
      <ShimmerBlock width={120} height={18} radius={8} />
      <ShimmerBlock width={80} height={22} radius={6} />
    </View>
    <View style={styles.skeletonMiddle}>
      <ShimmerBlock width={36} height={36} radius={18} />
      <View style={{ flex: 1, gap: 6 }}>
        <ShimmerBlock width={140} height={14} radius={6} />
        <ShimmerBlock width={90} height={11} radius={5} />
      </View>
    </View>
    <View style={styles.skeletonDivider} />
    <ShimmerBlock width={100} height={20} radius={999} />
  </View>
);

const ExpandedReceipt = ({ item, formatDate }) => {
  const order = item.orderId || {};
  const products = order.products || [];
  const discount = order.disscount || 0;
  const accountStatus = order.accountStatus || "—";
  const dueDate = order.dueDate;
  const totalAmount = Number(order.totalAmount || item.total || 0);

  const formatShortDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPayMethodStyle = (method) => {
    if (method === "Contado")
      return { color: COLORS.success, bg: COLORS.successBg, icon: "cash" };
    if (method === "Crédito")
      return { color: COLORS.info, bg: COLORS.infoBg, icon: "card" };
    if (method === "Cheque")
      return { color: COLORS.warning, bg: COLORS.warningBg, icon: "document-text" };
    return { color: COLORS.textMid, bg: COLORS.borderLight, icon: "wallet" };
  };

  const method = getPayMethodStyle(accountStatus);

  return (
    <View style={styles.receiptWrap}>
      <View style={styles.receiptDivider} />

      <View style={styles.receiptHeader}>
        <View style={styles.receiptIconBox}>
          <Ionicons name="receipt" size={14} color={COLORS.brand} />
        </View>
        <Text style={styles.receiptTitle}>Detalle del recibo</Text>
      </View>

      <View style={styles.receiptMetaRow}>
        <View style={styles.receiptMetaItem}>
          <Text style={styles.receiptMetaLabel}>Método de pago</Text>
          <View
            style={[styles.receiptMethodPill, { backgroundColor: method.bg }]}
          >
            <Ionicons name={method.icon} size={11} color={method.color} />
            <Text style={[styles.receiptMethodText, { color: method.color }]}>
              {accountStatus}
            </Text>
          </View>
        </View>

        {dueDate && (
          <View style={styles.receiptMetaItem}>
            <Text style={styles.receiptMetaLabel}>Vencimiento</Text>
            <View style={styles.receiptDueChip}>
              <Ionicons name="calendar" size={11} color={COLORS.text} />
              <Text style={styles.receiptDueText}>{formatShortDate(dueDate)}</Text>
            </View>
          </View>
        )}
      </View>

      {products.length > 0 && (
        <View style={styles.productsSection}>
          <Text style={styles.productsLabel}>
            Productos ({products.length})
          </Text>
          {products.slice(0, 5).map((p, idx) => {
            const subtotal = (p.precio || 0) * (p.cantidad || 0);
            return (
              <View
                key={idx}
                style={[
                  styles.productRow,
                  idx === Math.min(products.length, 5) - 1 &&
                    products.length <= 5 && {
                      borderBottomWidth: 0,
                    },
                ]}
              >
                <View style={styles.productQtyBadge}>
                  <Text style={styles.productQtyText}>×{p.cantidad}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {p.nombre}
                  </Text>
                  <Text style={styles.productPrice}>
                    Bs. {Number(p.precio || 0).toFixed(2)} c/u
                  </Text>
                </View>
                <Text style={styles.productSubtotal}>
                  Bs. {subtotal.toFixed(2)}
                </Text>
              </View>
            );
          })}
          {products.length > 5 && (
            <View style={styles.moreProducts}>
              <Text style={styles.moreProductsText}>
                +{products.length - 5} producto{products.length - 5 > 1 ? "s" : ""} más
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.totalsCard}>
        {discount > 0 && (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Descuento</Text>
            <Text style={[styles.totalsValue, { color: COLORS.success }]}>
              -Bs. {Number(discount).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsGrandLabel}>Total pagado</Text>
          <Text style={styles.totalsGrandValue}>
            Bs. {totalAmount.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.receiptFooter}>
        <Ionicons name="time-outline" size={11} color={COLORS.textLight} />
        <Text style={styles.receiptFooterText}>
          Registrado {formatDate(item.creationDate)}
        </Text>
      </View>
    </View>
  );
};

const PaymentCard = ({ item, isExpanded, onToggle, formatDate, getPaymentStatusStyle }) => {
  const status = getPaymentStatusStyle(item.paymentStatus);
  const chevronAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(chevronAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 60,
    }).start();
  }, [isExpanded, chevronAnim]);

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <TouchableOpacity
      style={[styles.paymentCard, isExpanded && styles.paymentCardActive]}
      activeOpacity={0.95}
      onPress={onToggle}
    >
      <View style={styles.paymentTop}>
        <View style={styles.paymentDateChip}>
          <Ionicons name="calendar-outline" size={11} color={COLORS.textMid} />
          <Text style={styles.paymentDateText}>
            {formatDate(item.creationDate)}
          </Text>
        </View>
        <Text style={styles.paymentAmount}>
          Bs. {Number(item.total || 0).toFixed(2)}
        </Text>
      </View>

      <View style={styles.paymentMiddle}>
        <View style={styles.paymentAvatar}>
          <Text style={styles.paymentAvatarText}>
            {item.orderId?.id_client?.name?.[0]?.toUpperCase()}
            {item.orderId?.id_client?.lastName?.[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.paymentClient} numberOfLines={1}>
            {item.orderId?.id_client?.name}{" "}
            {item.orderId?.id_client?.lastName}
          </Text>
          <Text style={styles.paymentNote}>
            Nota #{item.orderId?.receiveNumber}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDivider} />

      <View style={styles.paymentBottom}>
        <View style={[styles.paymentStatusPill, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={11} color={status.color} />
          <Text style={[styles.paymentStatusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <View style={styles.expandHint}>
          <Text style={styles.expandHintText}>
            {isExpanded ? "Ocultar" : "Ver recibo"}
          </Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={14} color={COLORS.brand} />
          </Animated.View>
        </View>
      </View>

      {isExpanded && <ExpandedReceipt item={item} formatDate={formatDate} />}
    </TouchableOpacity>
  );
};

export default function PaymentScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, idOwner, salesId } = useContext(AuthContext);

  const [searchTerm, setSearchTerm] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const range = 2;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  function utcToLocalDateString(utcDateStr, timeZone = "America/La_Paz") {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(utcDateStr);
  }

  const fetchProducts = async (pageNum = page) => {
    setLoading(true);
    try {
      const payload = {
        id_owner: idOwner,
        sales_id: salesId,
        limit: 8,
        page: pageNum,
        clientName: searchTerm,
      };
      if (startDate && endDate) {
        payload.startDate = utcToLocalDateString(startDate);
        payload.endDate = utcToLocalDateString(endDate);
      }
      const response = await axios.post(
        API_URL + "/whatsapp/order/pay/sales/id",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSalesData(response.data.data || []);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page);
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

  const formatDate2 = (date) => {
    if (!date) return "Seleccionar";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case "paid":
        return {
          bg: COLORS.infoBg,
          color: COLORS.info,
          label: "INGRESADO",
          icon: "receipt-outline",
        };
      case "confirmado":
        return {
          bg: COLORS.successBg,
          color: COLORS.success,
          label: "APROBADO",
          icon: "checkmark-circle",
        };
      case "rechazado":
        return {
          bg: COLORS.dangerBg,
          color: COLORS.danger,
          label: "RECHAZADO",
          icon: "close-circle",
        };
      default:
        return {
          bg: COLORS.borderLight,
          color: COLORS.textMid,
          label: "DESCONOCIDO",
          icon: "help-circle",
        };
    }
  };

  const totalPagos = salesData.length;
  const totalMonto = salesData.reduce((s, p) => s + (Number(p.total) || 0), 0);
  const pagosAprobados = salesData.filter(
    (p) => p.paymentStatus === "confirmado"
  ).length;

  const hasFilters = startDate || endDate || searchTerm;

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSearchTerm("");
    setTimeout(() => fetchProducts(1), 100);
  };

  const handleToggleExpand = (id) => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.8,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setExpandedId(expandedId === id ? null : id);
  };

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
                  <Text style={styles.heroTitle}>Mis cobros</Text>
                  <Text style={styles.heroSubtitle}>
                    Historial de pagos recibidos
                  </Text>
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.infoBg }]}>
                    <Ionicons name="receipt-outline" size={14} color={COLORS.info} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Total</Text>
                    <Text style={styles.kpiValue}>{totalPagos}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.successBg }]}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Aprobados</Text>
                    <Text style={styles.kpiValue}>{pagosAprobados}</Text>
                  </View>
                </View>
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningBg }]}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.warning} />
                  </View>
                  <View>
                    <Text style={styles.kpiLabel}>Monto</Text>
                    <Text style={styles.kpiValue} numberOfLines={1}>
                      Bs. {totalMonto.toFixed(0)}
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
                fetchProducts(1);
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
              (showFilters || hasFilters) && styles.filterToggleActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={showFilters || hasFilters ? "#fff" : COLORS.brand}
            />
            {hasFilters && !showFilters && <View style={styles.filterDot} />}
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
                themeVariant="light"
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
                themeVariant="light"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
            )}

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
                  fetchProducts(1);
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

        {loading && salesData.length === 0 ? (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: insets.bottom + 24,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : (
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
                <Ionicons name="card-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>Sin pagos</Text>
                <Text style={styles.emptyDesc}>
                  No encontramos pagos con estos filtros
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <PaymentCard
                item={item}
                isExpanded={expandedId === item._id}
                onToggle={() => handleToggleExpand(item._id)}
                formatDate={formatDate}
                getPaymentStatusStyle={getPaymentStatusStyle}
              />
            )}
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
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

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
  kpiValue: { fontSize: 14, color: COLORS.text, fontWeight: "800", marginTop: -1 },

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

  filterActions: { flexDirection: "row", gap: 8, marginTop: 14 },
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

  paymentCard: {
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
  paymentCardActive: {
    backgroundColor: "#fff",
    borderColor: COLORS.brand,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  paymentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  paymentDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paymentDateText: { fontSize: 10, color: COLORS.textMid, fontWeight: "600" },
  paymentAmount: { fontSize: 22, fontWeight: "800", color: COLORS.text },

  paymentMiddle: { flexDirection: "row", alignItems: "center", gap: 10 },
  paymentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.5,
  },
  paymentClient: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 1,
  },
  paymentNote: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },

  paymentDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 10,
  },

  paymentBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  paymentStatusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },

  expandHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expandHintText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.3,
  },

  receiptWrap: { marginTop: 12 },
  receiptDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginBottom: 14,
    borderStyle: "dashed",
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  receiptIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  receiptTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  receiptMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  receiptMetaItem: { flex: 1 },
  receiptMetaLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  receiptMethodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  receiptMethodText: {
    fontSize: 11,
    fontWeight: "800",
  },
  receiptDueChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptDueText: { fontSize: 11, fontWeight: "700", color: COLORS.text },

  productsSection: { marginBottom: 12 },
  productsLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  productQtyBadge: {
    minWidth: 36,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  productQtyText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  productName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 1,
  },
  productPrice: {
    fontSize: 10,
    color: COLORS.textMid,
    fontWeight: "600",
  },
  productSubtotal: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },
  moreProducts: {
    paddingTop: 8,
    alignItems: "center",
  },
  moreProductsText: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "700",
  },

  totalsCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  totalsLabel: { fontSize: 12, color: COLORS.textMid, fontWeight: "600" },
  totalsValue: { fontSize: 13, fontWeight: "800" },
  totalsGrandLabel: { fontSize: 13, color: COLORS.text, fontWeight: "800" },
  totalsGrandValue: { fontSize: 17, fontWeight: "800", color: COLORS.text },

  receiptFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 4,
  },
  receiptFooterText: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: "600",
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

  skeletonCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  skeletonTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  skeletonMiddle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginBottom: 14,
  },
});