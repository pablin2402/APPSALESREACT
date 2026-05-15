import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

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
  dangerBg: "#fee2e2",
};

export default function CartDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const cart1 = route.params?.carts || [];
  const [cart, setCart] = useState(cart1);

  const handleQuantityChange = (index, delta) => {
    const newCart = [...cart];
    const newQuantity = newCart[index].quantity + delta;
    if (newQuantity > 0) {
      newCart[index].quantity = newQuantity;
      setCart(newCart);
    }
  };

  const handleRemoveItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleQuantityInput = (index, text) => {
    const newCart = [...cart];
    const number = parseInt(text, 10);
    newCart[index].quantity = isNaN(number) || number < 0 ? 0 : number;
    setCart(newCart);
  };

  const calcularTotal = () => {
    return parseFloat(
      cart
        .reduce(
          (sum, item) => sum + item.quantity * (item.price - (item.discount || 0)),
          0
        )
        .toFixed(2)
    );
  };

  const calcularDescuentos = () => {
    return parseFloat(
      cart
        .reduce((sum, item) => sum + item.quantity * (item.discount || 0), 0)
        .toFixed(2)
    );
  };

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalProducts = cart.length;
  const subtotal = calcularTotal();
  const descuentos = calcularDescuentos();

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
                  <Text style={styles.heroTitle}>Tu carrito</Text>
                  <Text style={styles.heroSubtitle}>
                    {totalProducts} {totalProducts === 1 ? "producto" : "productos"} ·{" "}
                    {totalItems} {totalItems === 1 ? "unidad" : "unidades"}
                  </Text>
                </View>
                <View style={styles.cartIconBadge}>
                  <Ionicons name="bag" size={18} color="#fff" />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {cart.length > 0 ? (
          <ScrollView
            style={styles.cartList}
            contentContainerStyle={{
              padding: 20,
              paddingBottom: insets.bottom + 220,
            }}
            showsVerticalScrollIndicator={false}
          >
            {cart.map((item, index) => {
              const itemTotal =
                item.quantity * (item.price - (item.discount || 0));
              return (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemImageWrapper}>
                    <Image
                      source={{
                        uri: item.productImage || "https://via.placeholder.com/100",
                      }}
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.itemInfo}>
                    <View style={styles.itemTopRow}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.productName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveItem(index)}
                        style={styles.removeBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.brand} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itemPriceRow}>
                      <Text style={styles.itemUnitLabel}>Precio unitario</Text>
                      <Text style={styles.itemUnitPrice}>
                        Bs. {item.price.toFixed(2)}
                      </Text>
                    </View>

                    {item.discount > 0 && (
                      <View style={styles.discountChip}>
                        <Ionicons
                          name="pricetag"
                          size={10}
                          color={COLORS.success}
                        />
                        <Text style={styles.discountChipText}>
                          -Bs. {item.discount.toFixed(2)} dto.
                        </Text>
                      </View>
                    )}

                    <View style={styles.itemBottomRow}>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleQuantityChange(index, -1)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={item.quantity === 1 ? "trash-outline" : "remove"}
                            size={14}
                            color={COLORS.brand}
                          />
                        </TouchableOpacity>

                        <TextInput
                          value={String(item.quantity)}
                          onChangeText={(text) => handleQuantityInput(index, text)}
                          keyboardType="numeric"
                          style={styles.qtyInput}
                        />

                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleQuantityChange(index, 1)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={14} color={COLORS.brand} />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.itemTotal}>Bs. {itemTotal.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="bag-outline" size={48} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>Carrito vacío</Text>
            <Text style={styles.emptyDesc}>
              Agrega productos para continuar con tu pedido
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Agregar productos</Text>
            </TouchableOpacity>
          </View>
        )}

        {cart.length > 0 && (
          <View style={[styles.checkoutBar, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.summaryCard}>
              {descuentos > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Descuentos</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                    -Bs. {descuentos.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Subtotal</Text>
                <Text style={styles.summaryTotalValue}>
                  Bs. {subtotal.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.payButton}
              onPress={() =>
                navigation.navigate("ClientOrderDetailsScreen", { carts: cart })
              }
              activeOpacity={0.9}
            >
              <View style={styles.payBtnLeft}>
                <View style={styles.payBadge}>
                  <Text style={styles.payBadgeText}>{totalItems}</Text>
                </View>
                <Text style={styles.payText}>Ir a pagar</Text>
              </View>
              <View style={styles.payRight}>
                <Text style={styles.payAmount}>Bs. {subtotal.toFixed(2)}</Text>
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
  heroContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
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
  cartIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  cartList: { flex: 1 },

  itemCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  itemImageWrapper: {
    width: 70,
    height: 90,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%" },
  itemInfo: { flex: 1, justifyContent: "space-between" },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 18,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  itemPriceRow: { marginTop: 6, marginBottom: 4 },
  itemUnitLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textLight,
    textTransform: "uppercase",
  },
  itemUnitPrice: { fontSize: 13, fontWeight: "700", color: COLORS.textMid, marginTop: 1 },
  discountChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  discountChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success,
  },
  itemBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerBg,
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyInput: {
    minWidth: 28,
    paddingHorizontal: 4,
    paddingVertical: 0,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.brand,
    textAlign: "center",
  },
  itemTotal: { fontSize: 15, fontWeight: "800", color: COLORS.text },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.brand,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  checkoutBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 10,
  },
  summaryCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 12, color: COLORS.textMid, fontWeight: "600" },
  summaryValue: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  summaryTotalLabel: { fontSize: 14, color: COLORS.text, fontWeight: "800" },
  summaryTotalValue: { fontSize: 18, fontWeight: "800", color: COLORS.text },

  payButton: {
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
  payBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  payBadgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  payText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  payRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  payAmount: { color: "#fff", fontSize: 15, fontWeight: "800" },
});