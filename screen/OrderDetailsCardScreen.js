import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { calculateOrderPacking, calculateProductPacking } from "../utils/Routeoptimizermobile";

const COLORS = {
    brand: "#D3423E",
    bg: "#f9fafb",
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
    boxFull: "#374151",
    boxHalf: "#eab308",
    boxLoose: "#3b82f6",
};

const OrderDetailsCardScreen = ({ order }) => {
    if (!order?.products || order.products.length === 0) {
        return null;
    }

    const packing = calculateOrderPacking(order);
    const totalAmount = Number(order.totalAmount) || 0;
    const accountStatus = order.accountStatus;

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconBox}>
                        <Ionicons name="receipt" size={14} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Pedido del cliente</Text>
                        <Text style={styles.headerSubtitle}>
                            #{order.receiveNumber || "—"}
                            {accountStatus ? ` · ${accountStatus}` : ""}
                        </Text>
                    </View>
                </View>
                <View style={styles.headerStats}>
                    <View style={styles.statChip}>
                        <Ionicons name="cube" size={9} color={COLORS.brand} />
                        <Text style={styles.statChipText}>{packing.physicalBoxes}</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: COLORS.infoBg }]}>
                        <Ionicons name="wine" size={9} color={COLORS.info} />
                        <Text style={[styles.statChipText, { color: COLORS.info }]}>
                            {packing.totalBottles}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.packingRow}>
                {packing.fullBoxes > 0 && (
                    <View style={[styles.packingChip, { backgroundColor: COLORS.boxFull }]}>
                        <Text style={styles.packingChipText}>{packing.fullBoxes} × 12</Text>
                    </View>
                )}
                {packing.halfBoxes > 0 && (
                    <View style={[styles.packingChip, { backgroundColor: COLORS.boxHalf }]}>
                        <Text style={styles.packingChipText}>{packing.halfBoxes} × 6</Text>
                    </View>
                )}
                {packing.looseBottles > 0 && (
                    <View style={[styles.packingChip, { backgroundColor: COLORS.boxLoose }]}>
                        <Text style={styles.packingChipText}>
                            {packing.looseBottles} suelta{packing.looseBottles !== 1 ? "s" : ""}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.productsList}>
                {order.products.map((product, idx) => {
                    const productPacking = calculateProductPacking(product.cantidad);
                    const subtotal = Number(product.cantidad) * Number(product.precio);
                    return (
                        <View key={product._id || idx} style={styles.productItem}>
                            <View style={styles.productIcon}>
                                <Text style={styles.productIconText}>{product.cantidad}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.productName} numberOfLines={2}>
                                    {product.nombre}
                                </Text>
                                <View style={styles.productMeta}>
                                    <Text style={styles.productPrice}>
                                        Bs. {Number(product.precio).toFixed(2)} c/u
                                    </Text>
                                    {productPacking.fullBoxes + productPacking.halfBoxes + productPacking.looseBottles > 0 && (
                                        <View style={styles.productPackingChips}>
                                            {productPacking.fullBoxes > 0 && (
                                                <View style={[styles.miniChip, { backgroundColor: COLORS.boxFull }]}>
                                                    <Text style={styles.miniChipText}>
                                                        {productPacking.fullBoxes}×12
                                                    </Text>
                                                </View>
                                            )}
                                            {productPacking.halfBoxes > 0 && (
                                                <View style={[styles.miniChip, { backgroundColor: COLORS.boxHalf }]}>
                                                    <Text style={styles.miniChipText}>
                                                        {productPacking.halfBoxes}×6
                                                    </Text>
                                                </View>
                                            )}
                                            {productPacking.looseBottles > 0 && (
                                                <View style={[styles.miniChip, { backgroundColor: COLORS.boxLoose }]}>
                                                    <Text style={styles.miniChipText}>
                                                        {productPacking.looseBottles}s
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                            <Text style={styles.productSubtotal}>
                                Bs. {subtotal.toFixed(2)}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.totalCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.totalLabel}>Total a cobrar</Text>
                    <Text style={styles.totalSublabel}>
                        {order.products.length} producto{order.products.length !== 1 ? "s" : ""}
                        {" · "}
                        {packing.totalBottles} botella{packing.totalBottles !== 1 ? "s" : ""}
                    </Text>
                </View>
                <Text style={styles.totalAmount}>Bs. {totalAmount.toFixed(2)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: 14 },
    headerCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.dangerBg,
        padding: 10,
        borderRadius: 12,
        marginBottom: 8,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    iconBox: {
        width: 30, height: 30,
        borderRadius: 8,
        backgroundColor: COLORS.brand,
        justifyContent: "center", alignItems: "center",
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.brand,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    headerSubtitle: {
        fontSize: 10,
        color: COLORS.textMid,
        fontWeight: "600",
        marginTop: 1,
    },
    headerStats: {
        flexDirection: "row",
        gap: 6,
    },
    statChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#fff",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statChipText: {
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.brand,
    },

    packingRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    packingChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    packingChipText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: 0.3,
    },

    productsList: {
        backgroundColor: COLORS.bg,
        borderRadius: 12,
        padding: 8,
        gap: 8,
    },
    productItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    productIcon: {
        width: 36, height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.dangerBg,
        justifyContent: "center", alignItems: "center",
    },
    productIconText: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.brand,
    },
    productName: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.text,
        lineHeight: 16,
    },
    productMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
        flexWrap: "wrap",
    },
    productPrice: {
        fontSize: 10,
        color: COLORS.textMid,
        fontWeight: "600",
    },
    productPackingChips: {
        flexDirection: "row",
        gap: 3,
    },
    miniChip: {
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniChipText: {
        fontSize: 8,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: 0.2,
    },
    productSubtotal: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.text,
        marginLeft: 8,
    },

    totalCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.brand,
        padding: 14,
        borderRadius: 14,
        marginTop: 12,
        shadowColor: COLORS.brand,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: "rgba(255,255,255,0.85)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    totalSublabel: {
        fontSize: 10,
        color: "rgba(255,255,255,0.75)",
        marginTop: 2,
        fontWeight: "600",
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: 0.3,
    },
});

export default OrderDetailsCardScreen;