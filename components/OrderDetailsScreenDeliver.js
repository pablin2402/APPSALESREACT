import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Image,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { calculateOrderPacking, calculateProductPacking } from "../utils/Routeoptimizermobile";

const COLORS = {
  brand: "#D3423E",
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
  dangerBg: "#fee2e2",
  boxFull: "#374151",
  boxHalf: "#eab308",
  boxLoose: "#3b82f6",
};

export default function OrderDetailsScreenDeliver() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const item = route.params?.item;

  if (!item) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg }}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textLight} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text, marginTop: 12 }}>
            No se encontró el pedido
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  const clientName = `${item.name || ""} ${item.lastName || ""}`.trim();
  const sucursalName = item.client_location?.sucursalName;
  const direction = item.client_location?.direction;
  const packing = calculateOrderPacking(item);

  const getStatusStyle = (status) => {
    if (status === "LLego al destino") return { bg: COLORS.successBg, color: COLORS.success, label: "ENTREGADO", icon: "checkmark-circle" };
    if (status === "En camino") return { bg: COLORS.warningBg, color: COLORS.warning, label: "EN CAMINO", icon: "car-sport" };
    if (status === "Pedido entregado") return { bg: COLORS.infoBg, color: COLORS.info, label: "POR FINALIZAR", icon: "cube" };
    return { bg: COLORS.dangerBg, color: COLORS.brand, label: "PENDIENTE", icon: "time" };
  };

  const getAccountColor = (status) => {
    if (status === "Crédito") return { bg: COLORS.warningBg, fg: COLORS.warning };
    if (status === "Contado") return { bg: COLORS.successBg, fg: COLORS.success };
    if (status === "Cheque") return { bg: COLORS.infoBg, fg: COLORS.info };
    return { bg: COLORS.borderLight, fg: COLORS.textMid };
  };

  const status = getStatusStyle(item.visitStatus1);
  const accColor = getAccountColor(item.accountStatus);

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
                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {sucursalName || clientName}
                  </Text>
                  {sucursalName && (
                    <Text style={styles.heroSubtitle} numberOfLines={1}>{clientName}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Ionicons name={status.icon} size={12} color="#fff" />
                  <Text style={styles.statusBadgeText}>{status.label}</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Cliente card */}
          <View style={styles.clientCard}>
            {item.profilePicture ? (
              <Image source={{ uri: item.profilePicture }} style={styles.clientAvatar} />
            ) : (
              <View style={[styles.clientAvatar, styles.clientAvatarPlaceholder]}>
                <Text style={styles.clientAvatarInitials}>
                  {item.name?.[0]?.toUpperCase()}{item.lastName?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName} numberOfLines={1}>
                {sucursalName || clientName}
              </Text>
              {sucursalName && (
                <Text style={styles.clientSubname} numberOfLines={1}>{clientName}</Text>
              )}
              {direction && (
                <View style={styles.clientAddressRow}>
                  <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                  <Text style={styles.clientAddress} numberOfLines={2}>{direction}</Text>
                </View>
              )}
            </View>
            {item.accountStatus && (
              <View style={[styles.accountBadge, { backgroundColor: accColor.bg }]}>
                <Text style={[styles.accountBadgeText, { color: accColor.fg }]}>
                  {item.accountStatus.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* KPIs */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.dangerBg }]}>
                <Ionicons name="cube" size={14} color={COLORS.brand} />
              </View>
              <View>
                <Text style={styles.kpiLabel}>Cajas</Text>
                <Text style={styles.kpiValue}>{packing.physicalBoxes}</Text>
              </View>
            </View>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.infoBg }]}>
                <Ionicons name="wine" size={14} color={COLORS.info} />
              </View>
              <View>
                <Text style={styles.kpiLabel}>Botellas</Text>
                <Text style={styles.kpiValue}>{packing.totalBottles}</Text>
              </View>
            </View>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: COLORS.warningBg }]}>
                <Ionicons name="cash" size={14} color={COLORS.warning} />
              </View>
              <View>
                <Text style={styles.kpiLabel}>Total</Text>
                <Text style={styles.kpiValue} numberOfLines={1}>
                  Bs. {Number(item.totalAmount || 0).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Nota header */}
          <View style={styles.notaHeader}>
            <View style={styles.notaIconBox}>
              <Ionicons name="receipt" size={14} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notaTitle}>Nota #{item.receiveNumber}</Text>
              <Text style={styles.notaSubtitle}>
                {packing.physicalBoxes} caja{packing.physicalBoxes !== 1 ? "s" : ""} ·{" "}
                {packing.totalBottles} botella{packing.totalBottles !== 1 ? "s" : ""} ·{" "}
                {item.products?.length || 0} producto{item.products?.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <Text style={styles.notaTotal}>Bs. {Number(item.totalAmount || 0).toFixed(0)}</Text>
          </View>

          {/* Packing chips */}
          <View style={styles.packingRow}>
            {packing.fullBoxes > 0 && (
              <View style={[styles.packingChip, { backgroundColor: COLORS.boxFull }]}>
                <Ionicons name="cube" size={10} color="#fff" />
                <Text style={styles.packingChipText}>{packing.fullBoxes} × 12 caja completa</Text>
              </View>
            )}
            {packing.halfBoxes > 0 && (
              <View style={[styles.packingChip, { backgroundColor: COLORS.boxHalf }]}>
                <Ionicons name="cube-outline" size={10} color="#fff" />
                <Text style={styles.packingChipText}>{packing.halfBoxes} × 6 media caja</Text>
              </View>
            )}
            {packing.looseBottles > 0 && (
              <View style={[styles.packingChip, { backgroundColor: COLORS.boxLoose }]}>
                <Ionicons name="wine" size={10} color="#fff" />
                <Text style={styles.packingChipText}>{packing.looseBottles} suelta{packing.looseBottles !== 1 ? "s" : ""}</Text>
              </View>
            )}
          </View>

          {/* Productos */}
          <Text style={styles.sectionLabelText}>Productos</Text>
          <View style={styles.productsList}>
            {item.products?.map((product, idx) => {
              const pp = calculateProductPacking(product.cantidad);
              const subtotal = Number(product.cantidad) * Number(product.precio);
              return (
                <View key={product._id || idx} style={styles.productItem}>
                  <View style={styles.productImageWrapper}>
                    {product.productImage ? (
                      <Image
                        source={{ uri: product.productImage }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.productImage, { backgroundColor: COLORS.dangerBg, justifyContent: "center", alignItems: "center" }]}>
                        <Ionicons name="wine" size={20} color={COLORS.brand} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.productName} numberOfLines={2}>{product.nombre}</Text>
                    <Text style={styles.productLine}>{product.lyne}</Text>
                    <View style={styles.productMeta}>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyBadgeText}>×{product.cantidad}</Text>
                      </View>
                      <Text style={styles.productPrice}>Bs. {Number(product.precio).toFixed(0)} c/u</Text>
                    </View>
                    <View style={styles.productPackingRow}>
                      {pp.fullBoxes > 0 && (
                        <View style={[styles.miniChip, { backgroundColor: COLORS.boxFull }]}>
                          <Text style={styles.miniChipText}>{pp.fullBoxes}×12</Text>
                        </View>
                      )}
                      {pp.halfBoxes > 0 && (
                        <View style={[styles.miniChip, { backgroundColor: COLORS.boxHalf }]}>
                          <Text style={styles.miniChipText}>{pp.halfBoxes}×6</Text>
                        </View>
                      )}
                      {pp.looseBottles > 0 && (
                        <View style={[styles.miniChip, { backgroundColor: COLORS.boxLoose }]}>
                          <Text style={styles.miniChipText}>{pp.looseBottles}s</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.productSubtotal}>Bs. {subtotal.toFixed(0)}</Text>
                </View>
              );
            })}
          </View>

          {/* Total */}
          <View style={styles.grandTotalCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.grandTotalLabel}>Total a cobrar</Text>
              <Text style={styles.grandTotalSublabel}>
                {packing.totalBottles} botella{packing.totalBottles !== 1 ? "s" : ""} · {packing.physicalBoxes} caja{packing.physicalBoxes !== 1 ? "s" : ""}
              </Text>
            </View>
            <Text style={styles.grandTotalAmount}>Bs. {Number(item.totalAmount || 0).toFixed(0)}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  heroWrapper: { position: "relative", paddingBottom: 12 },
  heroBg: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.brand,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500", marginTop: 1 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  statusBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  clientCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3,
    marginBottom: 12,
  },
  clientAvatar: { width: 54, height: 54, borderRadius: 27 },
  clientAvatarPlaceholder: { backgroundColor: COLORS.dangerBg, justifyContent: "center", alignItems: "center" },
  clientAvatarInitials: { fontSize: 18, fontWeight: "800", color: COLORS.brand },
  clientName: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginBottom: 2 },
  clientSubname: { fontSize: 12, color: COLORS.textMid, fontWeight: "500", marginBottom: 4 },
  clientAddressRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  clientAddress: { flex: 1, fontSize: 11, color: COLORS.textMid, fontWeight: "500", lineHeight: 15 },
  accountBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  accountBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpiCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 10,
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  kpiIcon: { width: 28, height: 28, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  kpiLabel: { fontSize: 10, color: COLORS.textMid, fontWeight: "600" },
  kpiValue: { fontSize: 13, color: COLORS.text, fontWeight: "800", marginTop: -1 },

  notaHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.dangerBg, borderRadius: 14, padding: 12, marginBottom: 10,
  },
  notaIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center",
  },
  notaTitle: { fontSize: 13, fontWeight: "800", color: COLORS.brand },
  notaSubtitle: { fontSize: 10, color: COLORS.textMid, fontWeight: "600", marginTop: 2 },
  notaTotal: { fontSize: 16, fontWeight: "800", color: COLORS.brand },

  packingRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  packingChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  packingChipText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  sectionLabelText: {
    fontSize: 11, fontWeight: "800", color: COLORS.textMid,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },

  productsList: { gap: 10, marginBottom: 16 },
  productItem: {
    backgroundColor: "#fff", borderRadius: 14, padding: 12,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1,
  },
  productImageWrapper: { borderRadius: 10, overflow: "hidden" },
  productImage: { width: 56, height: 56, borderRadius: 10 },
  productName: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginBottom: 2 },
  productLine: { fontSize: 10, color: COLORS.textMid, fontWeight: "600", marginBottom: 4 },
  productMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  qtyBadge: {
    backgroundColor: COLORS.brand, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  qtyBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  productPrice: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },
  productPackingRow: { flexDirection: "row", gap: 4 },
  miniChip: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  miniChipText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
  productSubtotal: { fontSize: 13, fontWeight: "800", color: COLORS.text, marginLeft: 8 },

  grandTotalCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.brand, padding: 16, borderRadius: 16,
    shadowColor: COLORS.brand, shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5,
  },
  grandTotalLabel: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.5 },
  grandTotalSublabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2, fontWeight: "600" },
  grandTotalAmount: { fontSize: 24, fontWeight: "900", color: "#fff", letterSpacing: 0.3 },
});