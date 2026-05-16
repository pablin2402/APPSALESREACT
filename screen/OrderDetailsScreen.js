import React, { useEffect,useRef, useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  UIManager,
  Easing,
  Platform,
} from "react-native";
import axios from "axios";
import { API_URL } from "../config";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
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

export default function OrderDetailsScreen() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const clientId = route.params?.orderId;
  const productsList = route.params?.products;
  const filesList = route.params?.files;

  const [totalGeneral, setTotalGeneral] = useState(0);
  const [totalDescuentos, setTotalDescuentos] = useState(0);
  const [paymentsData, setPaymentsData] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState(false);

  const { token, idOwner } = useContext(AuthContext);

  useEffect(() => {
    if (Array.isArray(productsList)) {
      let total = 0;
      let descuentos = 0;
      productsList.forEach((product) => {
        const precio = product.precio || 0;
        const cantidad = product.cantidad || 1;
        const descuento = product.descuento || 0;
        descuentos += descuento * cantidad;
        total += (precio - descuento) * cantidad;
      });
      setTotalGeneral(total);
      setTotalDescuentos(descuentos);
    }
  }, [productsList]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      await axios.post(
        API_URL + "/whatsapp/order/pay/list/id",
        { orderId: clientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Error al cargar los productos:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchPayments = useCallback(async () => {
    try {
      const response = await axios.post(
        API_URL + "/whatsapp/order/pay/id",
        {
          id_client: filesList.id_client._id,
          id_owner: idOwner,
          orderId: filesList._id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const payments = response.data || [];
      const totalPaidSum = payments.reduce((sum, p) => sum + (p.total || 0), 0);
      const totalDebtInitial = payments.length > 0 ? payments[0].debt : 0;
      setPaymentsData(payments);
      setTotalPaid(totalPaidSum);
      setTotalDebt(totalDebtInitial);
    } catch (error) {
      console.error("Error al obtener los pagos", error);
    }
  }, [filesList, idOwner, token]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const formatAccountStatus = (status) => {
    switch (status) {
      case "pending":
        return "Contado";
      case "credito":
        return "Crédito";
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case "paid":
        return { bg: COLORS.infoBg, text: COLORS.info, label: "INGRESADO", icon: "receipt-outline" };
      case "confirmado":
        return { bg: COLORS.successBg, text: COLORS.success, label: "CONFIRMADO", icon: "checkmark-circle" };
      case "rechazado":
        return { bg: COLORS.dangerBg, text: COLORS.danger, label: "RECHAZADO", icon: "close-circle" };
      default:
        return { bg: COLORS.borderLight, text: COLORS.textMid, label: "DESCONOCIDO", icon: "help-circle-outline" };
    }
  };

  const calculatedDebt = totalGeneral - totalPaid > 0 ? totalGeneral - totalPaid : 0;
  const progressPaid = totalGeneral > 0 ? (totalPaid / totalGeneral) * 100 : 0;

  const handlePay = () => {
    navigation.navigate("AddPayment", {
      client: filesList.id_client._id,
      order: clientId,
      debt: calculatedDebt,
    });
  };

  const totalProducts = productsList?.length || 0;
  const totalUnits = productsList?.reduce((s, p) => s + (p.cantidad || 0), 0) || 0;

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
                  <Text style={styles.heroTitle}>Detalle del pedido</Text>
                  <Text style={styles.heroSubtitle}>
                    Nota #{filesList?.receiveNumber || "—"}
                  </Text>
                </View>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {formatAccountStatus(filesList?.accountStatus) || "—"}
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIcon, { backgroundColor: COLORS.infoBg }]}>
                  <Ionicons name="person" size={14} color={COLORS.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>Vendedor</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {filesList?.salesId?.fullName} {filesList?.salesId?.lastName}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIcon, { backgroundColor: COLORS.warningBg }]}>
                  <Ionicons name="calendar" size={14} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>Vencimiento</Text>
                  <Text style={styles.summaryValue}>
                    {filesList?.dueDate
                      ? formatDate(filesList.dueDate)
                      : formatDate(filesList?.creationDate)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.amountsCard}>
            <View style={styles.amountsHeader}>
              <Text style={styles.amountsTitle}>Resumen financiero</Text>
              <View
                style={[
                  styles.amountsPill,
                  {
                    backgroundColor:
                      progressPaid >= 100 ? COLORS.successBg : COLORS.dangerBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.amountsPillText,
                    {
                      color: progressPaid >= 100 ? COLORS.success : COLORS.brand,
                    },
                  ]}
                >
                  {progressPaid >= 100 ? "PAGADO" : "PENDIENTE"}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progressPaid, 100)}%`,
                    backgroundColor:
                      progressPaid >= 100 ? COLORS.success : COLORS.brand,
                  },
                ]}
              />
            </View>

            <View style={styles.amountsGrid}>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>Total</Text>
                <Text style={styles.amountValue}>Bs. {totalGeneral.toFixed(2)}</Text>
              </View>
              <View style={[styles.amountItem, styles.amountItemBorder]}>
                <Text style={styles.amountLabel}>Pagado</Text>
                <Text style={[styles.amountValue, { color: COLORS.success }]}>
                  Bs. {totalPaid.toFixed(2)}
                </Text>
              </View>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>Saldo</Text>
                <Text style={[styles.amountValue, { color: COLORS.brand }]}>
                  Bs. {calculatedDebt.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "products" && styles.activeTab]}
              onPress={() => setActiveTab("products")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="bag-outline"
                size={14}
                color={activeTab === "products" ? "#fff" : COLORS.textMid}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "products" && styles.activeTabText,
                ]}
              >
                Productos ({totalProducts})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "payments" && styles.activeTab]}
              onPress={() => setActiveTab("payments")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="card-outline"
                size={14}
                color={activeTab === "payments" ? "#fff" : COLORS.textMid}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "payments" && styles.activeTabText,
                ]}
              >
                Pagos ({paymentsData.length})
              </Text>
            </TouchableOpacity>
          </View>
        {loading && productsList.length === 0 ? (
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
          <>
           {activeTab === "products" && (
            <View style={styles.tabContent}>
              {productsList && productsList.length > 0 ? (
                <>
                  <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                      <Ionicons name="cube-outline" size={12} color={COLORS.brand} />
                      <Text style={styles.statChipText}>
                        {totalProducts} {totalProducts === 1 ? "producto" : "productos"}
                      </Text>
                    </View>
                    <View style={styles.statChip}>
                      <Ionicons name="layers-outline" size={12} color={COLORS.brand} />
                      <Text style={styles.statChipText}>
                        {totalUnits} unidades
                      </Text>
                    </View>
                    {totalDescuentos > 0 && (
                      <View style={[styles.statChip, { backgroundColor: COLORS.successBg }]}>
                        <Ionicons name="pricetag-outline" size={12} color={COLORS.success} />
                        <Text style={[styles.statChipText, { color: COLORS.success }]}>
                          Bs. {totalDescuentos.toFixed(2)} dto.
                        </Text>
                      </View>
                    )}
                  </View>

                  {productsList.map((item, index) => {
                    const subtotal =
                      ((item.precio || 0) - (item.descuento || 0)) *
                      (item.cantidad || 1);
                    return (
                      <View key={index} style={styles.productCard}>
                        <View style={styles.productLeft}>
                          <View style={styles.productIconBox}>
                            <Ionicons name="cube" size={18} color={COLORS.brand} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.productName} numberOfLines={2}>
                              {item.nombre || "Sin nombre"}
                            </Text>
                            <View style={styles.productMetaRow}>
                              <View style={styles.qtyBadge}>
                                <Text style={styles.qtyBadgeText}>
                                  ×{item.cantidad || 1}
                                </Text>
                              </View>
                              <Text style={styles.productUnit}>
                                Bs. {(item.precio || 0).toFixed(2)} c/u
                              </Text>
                              {item.descuento > 0 && (
                                <Text style={styles.productDiscount}>
                                  -Bs. {item.descuento.toFixed(2)}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                        <Text style={styles.productSubtotal}>
                          Bs. {subtotal.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="bag-outline" size={40} color={COLORS.textLight} />
                  <Text style={styles.emptyTitle}>Sin productos</Text>
                  <Text style={styles.emptyDesc}>
                    Este pedido no tiene productos asignados
                  </Text>
                </View>
              )}
            </View>
          )}
          {activeTab === "payments" && (
            <View style={styles.tabContent}>
              {paymentsData && paymentsData.length > 0 ? (
                paymentsData.map((item) => {
                  const status = getPaymentStatusStyle(item.paymentStatus);
                  return (
                    <View key={item._id} style={styles.paymentCard}>
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
                            {item.sales_id?.fullName?.[0]?.toUpperCase()}
                            {item.sales_id?.lastName?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.paymentSeller} numberOfLines={1}>
                          {item.sales_id?.fullName} {item.sales_id?.lastName}
                        </Text>
                      </View>

                      <View style={[styles.paymentStatusPill, { backgroundColor: status.bg }]}>
                        <Ionicons name={status.icon} size={11} color={status.text} />
                        <Text style={[styles.paymentStatusText, { color: status.text }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="card-outline" size={40} color={COLORS.textLight} />
                  <Text style={styles.emptyTitle}>Sin pagos registrados</Text>
                  <Text style={styles.emptyDesc}>
                    Aún no se ha realizado ningún pago
                  </Text>
                </View>
              )}
            </View>
          )}
          </>
         
          )}
        </ScrollView>

        {activeTab === "payments" && totalGeneral > totalPaid && (
          <View style={[styles.payBtnWrapper, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              onPress={handlePay}
              style={styles.payBtn}
              activeOpacity={0.9}
            >
              <View style={styles.payBtnLeft}>
                <Ionicons name="card" size={20} color="#fff" />
                <Text style={styles.payBtnText}>Pagar</Text>
              </View>
              <View style={styles.payBtnRight}>
                <Text style={styles.payBtnAmount}>
                  Bs. {calculatedDebt.toFixed(2)}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },

  heroWrapper: { position: "relative", paddingBottom: 8 },
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
  heroContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  heroTop: { flexDirection: "row", alignItems: "center" },
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
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 10, color: COLORS.textMid, fontWeight: "700", textTransform: "uppercase" },
  summaryValue: { fontSize: 13, color: COLORS.text, fontWeight: "700", marginTop: 1 },
  summaryDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 10 },

  amountsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  amountsTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  amountsPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  amountsPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: { height: "100%", borderRadius: 999 },
  amountsGrid: { flexDirection: "row" },
  amountItem: { flex: 1, alignItems: "center" },
  amountItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.borderLight,
  },
  amountLabel: { fontSize: 10, color: COLORS.textMid, fontWeight: "700", textTransform: "uppercase" },
  amountValue: { fontSize: 14, color: COLORS.text, fontWeight: "800", marginTop: 2 },

  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: { color: COLORS.textMid, fontWeight: "800", fontSize: 12 },
  activeTabText: { color: "#fff" },

  tabContent: { paddingHorizontal: 20, paddingTop: 16 },

  statsRow: { flexDirection: "row", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statChipText: { fontSize: 11, fontWeight: "700", color: COLORS.brand },

  productCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  productIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  productName: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  productMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  qtyBadge: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  qtyBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  productUnit: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },
  productDiscount: { fontSize: 11, color: COLORS.success, fontWeight: "700" },
  productSubtotal: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginLeft: 8 },

  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  paymentDateText: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },
  paymentAmount: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  paymentMiddle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  paymentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentAvatarText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.5,
  },
  paymentSeller: { flex: 1, fontSize: 13, fontWeight: "700", color: COLORS.text },
  paymentStatusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  paymentStatusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginTop: 10 },
  emptyDesc: { fontSize: 12, color: COLORS.textMid, marginTop: 4, textAlign: "center" },

  payBtnWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "transparent",
  },
  payBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  payBtnLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  payBtnRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  payBtnAmount: { color: "#fff", fontSize: 16, fontWeight: "800" },

  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },

  skeletonCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    padding: 8,
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