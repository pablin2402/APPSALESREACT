import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
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

const SingleOrderCard = ({ order, idx, totalOrders, defaultExpanded }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const packing = calculateOrderPacking(order);
    const orderTotal = Number(order.totalAmount) || 0;
    const accountStatus = order.accountStatus;
    const isMultiple = totalOrders > 1;

    const getAccountColor = () => {
        if (accountStatus === "Crédito") return { bg: COLORS.warningBg, fg: COLORS.warning };
        if (accountStatus === "Contado") return { bg: COLORS.successBg, fg: COLORS.success };
        if (accountStatus === "Cheque") return { bg: COLORS.infoBg, fg: COLORS.info };
        return { bg: COLORS.borderLight, fg: COLORS.textMid };
    };
    const accColor = getAccountColor();

    return (
        <View style={styles.orderCard}>
            <TouchableOpacity
                onPress={() => isMultiple && setExpanded(!expanded)}
                activeOpacity={isMultiple ? 0.7 : 1}
                style={styles.orderHeader}
            >
                {isMultiple && (
                    <View style={styles.orderIndexBadge}>
                        <Text style={styles.orderIndexText}>{idx + 1}</Text>
                        <Text style={styles.orderIndexLabel}>de {totalOrders}</Text>
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <View style={styles.orderTitleRow}>
                        <Text style={styles.orderTitle}>
                            Pedido #{order.receiveNumber || "—"}
                        </Text>
                        {accountStatus && (
                            <View style={[styles.accountBadge, { backgroundColor: accColor.bg }]}>
                                <Text style={[styles.accountBadgeText, { color: accColor.fg }]}>
                                    {accountStatus.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.orderSubtitle}>
                        {packing.physicalBoxes} caja{packing.physicalBoxes !== 1 ? "s" : ""} ·{" "}
                        {packing.totalBottles} botella{packing.totalBottles !== 1 ? "s" : ""} ·{" "}
                        {order.products?.length || 0} producto{order.products?.length !== 1 ? "s" : ""}
                    </Text>
                </View>
                <View style={styles.orderTotalCol}>
                    <Text style={styles.orderTotalLabel}>Subtotal</Text>
                    <Text style={styles.orderTotalValue}>Bs. {orderTotal.toFixed(2)}</Text>
                </View>
                {isMultiple && (
                    <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={COLORS.textMid}
                        style={{ marginLeft: 6 }}
                    />
                )}
            </TouchableOpacity>

            {(expanded || !isMultiple) && (
                <View style={styles.orderBody}>
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
                        {order.products?.map((product, pIdx) => {
                            const pp = calculateProductPacking(product.cantidad);
                            const subtotal = Number(product.cantidad) * Number(product.precio);
                            return (
                                <View key={product._id || pIdx} style={styles.productItem}>
                                    <View style={styles.productQtyBadge}>
                                        <Text style={styles.productQtyText}>{product.cantidad}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.productName} numberOfLines={2}>
                                            {product.nombre}
                                        </Text>
                                        <View style={styles.productMeta}>
                                            <Text style={styles.productPrice}>
                                                Bs. {Number(product.precio).toFixed(2)} c/u
                                            </Text>
                                            <View style={styles.productPackingChips}>
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
                                    </View>
                                    <Text style={styles.productSubtotal}>
                                        Bs. {subtotal.toFixed(2)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
};

const OrderDetailsCardScreen = ({ stop }) => {
    if (!stop) return null;

    const orders = stop.orders && Array.isArray(stop.orders) && stop.orders.length > 0
        ? stop.orders
        : (stop.products ? [stop] : []);

    if (orders.length === 0) return null;

    const grandTotal = orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const grandBoxes = orders.reduce((s, o) => s + calculateOrderPacking(o).physicalBoxes, 0);
    const grandBottles = orders.reduce((s, o) => s + calculateOrderPacking(o).totalBottles, 0);
    const isMultiple = orders.length > 1;

    return (
        <View style={styles.container}>
            <View style={styles.summaryBar}>
                <View style={styles.summaryLeft}>
                    <View style={styles.summaryIcon}>
                        <Ionicons name="receipt" size={14} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.summaryTitle}>
                            {isMultiple
                                ? `${orders.length} pedidos del cliente`
                                : "Detalle del pedido"
                            }
                        </Text>
                        <Text style={styles.summarySubtitle}>
                            {grandBoxes} caja{grandBoxes !== 1 ? "s" : ""} ·{" "}
                            {grandBottles} botella{grandBottles !== 1 ? "s" : ""}
                        </Text>
                    </View>
                </View>
                <View style={styles.summaryStats}>
                    <View style={[styles.summaryStatChip, { backgroundColor: "#fff" }]}>
                        <Ionicons name="cube" size={9} color={COLORS.brand} />
                        <Text style={[styles.summaryStatText, { color: COLORS.brand }]}>{grandBoxes}</Text>
                    </View>
                    <View style={[styles.summaryStatChip, { backgroundColor: COLORS.infoBg }]}>
                        <Ionicons name="wine" size={9} color={COLORS.info} />
                        <Text style={[styles.summaryStatText, { color: COLORS.info }]}>{grandBottles}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.ordersStack}>
                {orders.map((order, idx) => (
                    <SingleOrderCard
                        key={order._id || idx}
                        order={order}
                        idx={idx}
                        totalOrders={orders.length}
                        defaultExpanded={!isMultiple || idx === 0}
                    />
                ))}
            </View>

            <View style={styles.grandTotalCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.grandTotalLabel}>
                        {isMultiple ? "Total a cobrar al cliente" : "Total a cobrar"}
                    </Text>
                    <Text style={styles.grandTotalSublabel}>
                        {isMultiple
                            ? `Suma de los ${orders.length} pedidos`
                            : `${grandBottles} botella${grandBottles !== 1 ? "s" : ""} en total`
                        }
                    </Text>
                </View>
                <Text style={styles.grandTotalAmount}>Bs. {grandTotal.toFixed(2)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: 14 },

    summaryBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.dangerBg,
        padding: 10,
        borderRadius: 12,
        marginBottom: 10,
    },
    summaryLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    summaryIcon: {
        width: 30, height: 30,
        borderRadius: 8,
        backgroundColor: COLORS.brand,
        justifyContent: "center", alignItems: "center",
        marginRight: 10,
    },
    summaryTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.brand,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    summarySubtitle: {
        fontSize: 10,
        color: COLORS.textMid,
        fontWeight: "600",
        marginTop: 1,
    },
    summaryStats: {
        flexDirection: "row",
        gap: 6,
    },
    summaryStatChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    summaryStatText: {
        fontSize: 11,
        fontWeight: "800",
    },

    ordersStack: {
        gap: 8,
    },

    orderCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        overflow: "hidden",
    },
    orderHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        backgroundColor: COLORS.bg,
    },
    orderIndexBadge: {
        width: 36,
        backgroundColor: COLORS.brand,
        borderRadius: 8,
        paddingVertical: 4,
        alignItems: "center",
        marginRight: 10,
    },
    orderIndexText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "900",
        lineHeight: 16,
    },
    orderIndexLabel: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 8,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.3,
        marginTop: -1,
    },
    orderTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
    },
    orderTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.text,
    },
    accountBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    accountBadgeText: {
        fontSize: 8,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
    orderSubtitle: {
        fontSize: 10,
        color: COLORS.textMid,
        fontWeight: "600",
        marginTop: 2,
    },
    orderTotalCol: {
        alignItems: "flex-end",
        marginLeft: 8,
    },
    orderTotalLabel: {
        fontSize: 9,
        color: COLORS.textLight,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    orderTotalValue: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.text,
    },

    orderBody: {
        padding: 10,
        gap: 8,
    },
    packingRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 5,
    },
    packingChip: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 5,
    },
    packingChipText: {
        fontSize: 9,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: 0.3,
    },

    productsList: {
        gap: 6,
    },
    productItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.bg,
        padding: 8,
        borderRadius: 8,
    },
    productQtyBadge: {
        width: 34, height: 34,
        borderRadius: 8,
        backgroundColor: COLORS.dangerBg,
        justifyContent: "center", alignItems: "center",
    },
    productQtyText: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.brand,
    },
    productName: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.text,
        lineHeight: 15,
    },
    productMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 3,
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
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
    },
    miniChipText: {
        fontSize: 8,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: 0.2,
    },
    productSubtotal: {
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.text,
        marginLeft: 6,
    },

    grandTotalCard: {
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
    grandTotalLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: "rgba(255,255,255,0.85)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    grandTotalSublabel: {
        fontSize: 10,
        color: "rgba(255,255,255,0.75)",
        marginTop: 2,
        fontWeight: "600",
    },
    grandTotalAmount: {
        fontSize: 22,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: 0.3,
    },
});

export default OrderDetailsCardScreen;