import React, { useState, useContext } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Image,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import * as Location from "expo-location";
import axios from "axios";
import { API_URL } from "../config";
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
  dangerBg: "#fee2e2",
};

const PAYMENT_TYPES = [
  { value: "Contado", label: "Contado", icon: "cash", color: COLORS.success, bg: COLORS.successBg },
  { value: "Crédito", label: "Crédito", icon: "card", color: COLORS.info, bg: COLORS.infoBg },
  { value: "Cheque", label: "Cheque", icon: "document-text", color: COLORS.warning, bg: COLORS.warningBg },
];

const CREDIT_TERMS = [
  { value: "1 Semana", label: "1 semana", days: 7 },
  { value: "2 Semanas", label: "2 semanas", days: 14 },
  { value: "1 Mes", label: "1 mes", days: 30 },
  { value: "45 Dias", label: "45 días", days: 45 },
];

export default function CartFinalDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const cart1 = route.params?.carts || [];
  const client1 = route.params?.client || [];

  const [formData, setFormData] = useState({ tipoPago: "", plazoCredito: "" });
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState("");
  const [cart, setCart] = useState(cart1);
  const [client] = useState(client1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [submitting, setSubmitting] = useState(false);

  const currentDate = new Date();
  const { token, idOwner, salesId } = useContext(AuthContext);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsPickerVisible(false);
  };

  const handleOpenPicker = (type) => {
    setPickerType(type);
    setIsPickerVisible(true);
  };

  const showModal = () => {
    setShowSuccessModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowSuccessModal(false));
    }, 3000);
  };

  const handleRemoveItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
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

  const generateReceiveNumber = () => {
    return Math.floor(Math.random() * (1000000000 - 10000000) + 10000000);
  };

  const calcularFechaPago = (creationDate, plazoCredito) => {
    if (!creationDate) return "No disponible";
    const fecha = new Date(creationDate);
    if (!plazoCredito || plazoCredito.trim() === "") {
      return fecha.toLocaleDateString();
    }
    const cleanPlazo = plazoCredito
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    switch (cleanPlazo) {
      case "1 Semana":
        fecha.setDate(fecha.getDate() + 7);
        break;
      case "2 Semanas":
        fecha.setDate(fecha.getDate() + 14);
        break;
      case "1 Mes":
        fecha.setMonth(fecha.getMonth() + 1);
        break;
      case "45 Dias":
        fecha.setDate(fecha.getDate() + 45);
        break;
      default:
        return fecha;
    }
    return fecha;
  };

  async function getUserLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permisos denegados");
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  }

  const fetchActivity = async (selectedClient, text) => {
    try {
      const userLocation = await getUserLocation();
      await axios.post(
        API_URL + "/whatsapp/salesman/activity",
        {
          salesMan: salesId,
          details: text,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          location: selectedClient.client_location.direction,
          id_owner: idOwner,
          clientName: selectedClient._id,
          visitDuration: "00:00",
          visitDurationSeconds: 0,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {}
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      alert("Debe seleccionar al menos un producto.");
      return;
    }
    if (!formData.tipoPago) {
      alert("Debe seleccionar un tipo de pago.");
      return;
    }
    if (formData.tipoPago === "Crédito" && !formData.plazoCredito) {
      alert("Debe seleccionar un plazo para el crédito.");
      return;
    }
    setSubmitting(true);
    try {
      const orderResponse = await Promise.race([
        axios.post(
          API_URL + "/whatsapp/order",
          {
            creationDate: currentDate,
            receiveNumber: generateReceiveNumber(),
            noteAditional: "",
            id_owner: idOwner,
            products: cart.map((item) => ({
              id: item.id,
              nombre: item.productName,
              cantidad: item.quantity,
              precio: item.price,
              unidadesPorCaja: item.numberofUnitsPerBox,
              productImage: item.productImage,
              caja: item.quantity / item.numberofUnitsPerBox,
              lyne: item.categoryId.categoryName,
            })),
            disscount: calcularDescuentos(),
            tax: 0,
            totalAmount: calcularTotal(),
            nit: 0,
            razonSocial: "",
            cellPhone: 0,
            direction: "No disponible",
            accountStatus: formData.tipoPago,
            dueDate: calcularFechaPago(currentDate, formData.tipoPago),
            id_client: client1._id || "No seleccionado",
            salesId: salesId,
            region: "TOTAL CBB",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 10000)
        ),
      ]);

      if (orderResponse.status === 200) {
        showModal();
        fetchActivity(client1, "Pedido");
        setCart([]);
        setFormData({ tipoPago: "", plazoCredito: "" });

        const clientId = orderResponse.data._id;
        const lat = 1;
        const lng = 1;
        try {
          await axios.post(
            API_URL + "/whatsapp/order/track",
            {
              orderId: clientId,
              eventType: "Orden Creada",
              triggeredBySalesman: salesId,
              triggeredByDelivery: "",
              triggeredByUser: "",
              location: { lat, lng },
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (error) {
          console.error("Error al enviar evento de orden:", error);
        }

        setTimeout(() => {
          navigation.navigate("Main", { screen: "Principal" });
        }, 1500);
      }
    } catch (error) {
      console.error("Error al enviar la orden:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = calcularTotal();
  const descuentos = calcularDescuentos();
  const fechaPago = formData.tipoPago === "Crédito" && formData.plazoCredito
    ? calcularFechaPago(currentDate, formData.plazoCredito)
    : null;

  const isFormValid =
    cart.length > 0 &&
    formData.tipoPago &&
    (formData.tipoPago !== "Crédito" || formData.plazoCredito);

  const renderPickerOption = (option, isActive, onPress, isPaymentType) => (
    <TouchableOpacity
      key={option.value}
      style={[styles.pickerOption, isActive && styles.pickerOptionActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isPaymentType && (
        <View style={[styles.pickerOptionIcon, { backgroundColor: option.bg }]}>
          <Ionicons name={option.icon} size={16} color={option.color} />
        </View>
      )}
      <Text
        style={[
          styles.pickerOptionText,
          isActive && styles.pickerOptionTextActive,
          !isPaymentType && { marginLeft: 0 },
        ]}
      >
        {option.label}
      </Text>
      {isActive && (
        <Ionicons name="checkmark-circle" size={18} color={COLORS.brand} />
      )}
    </TouchableOpacity>
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
                  <Text style={styles.heroTitle}>Confirmar pedido</Text>
                  <Text style={styles.heroSubtitle}>
                    Revisa antes de registrar
                  </Text>
                </View>
              </View>

              <View style={styles.clientCard}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>
                    {client.name?.[0]?.toUpperCase()}
                    {client.lastName?.[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientLabel}>CLIENTE</Text>
                  <Text style={styles.clientName} numberOfLines={1}>
                    {client.name} {client.lastName}
                  </Text>
                </View>
                <View style={styles.itemsBadge}>
                  <Ionicons name="bag" size={12} color={COLORS.brand} />
                  <Text style={styles.itemsBadgeText}>{totalItems}</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 240,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Método de pago</Text>
          <View style={styles.paymentTypeRow}>
            {PAYMENT_TYPES.map((type) => {
              const isActive = formData.tipoPago === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.paymentTypeCard,
                    isActive && styles.paymentTypeCardActive,
                  ]}
                  onPress={() => handleChange("tipoPago", type.value)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.paymentTypeIcon,
                      { backgroundColor: type.bg },
                    ]}
                  >
                    <Ionicons name={type.icon} size={18} color={type.color} />
                  </View>
                  <Text
                    style={[
                      styles.paymentTypeLabel,
                      isActive && styles.paymentTypeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {isActive && (
                    <View style={styles.paymentTypeCheck}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.brand} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {formData.tipoPago === "Crédito" && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                Plazo del crédito
              </Text>
              <View style={styles.termsRow}>
                {CREDIT_TERMS.map((term) => {
                  const isActive = formData.plazoCredito === term.value;
                  return (
                    <TouchableOpacity
                      key={term.value}
                      style={[styles.termChip, isActive && styles.termChipActive]}
                      onPress={() => handleChange("plazoCredito", term.value)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.termChipText,
                          isActive && styles.termChipTextActive,
                        ]}
                      >
                        {term.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {fechaPago && (
                <View style={styles.dueDateCard}>
                  <Ionicons name="calendar" size={14} color={COLORS.info} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dueDateLabel}>Vencimiento</Text>
                    <Text style={styles.dueDateValue}>
                      {new Date(fechaPago).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
            Productos ({cart.length})
          </Text>

          {cart.length > 0 ? (
            cart.map((item, index) => {
              const itemTotal =
                item.quantity * (item.price - (item.discount || 0));
              return (
                <View key={index} style={styles.productCard}>
                  <View style={styles.productImageWrapper}>
                    <Image
                      source={{
                        uri: item.productImage || "https://via.placeholder.com/80",
                      }}
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <View style={styles.productMeta}>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyBadgeText}>×{item.quantity}</Text>
                      </View>
                      <Text style={styles.productUnit}>
                        Bs. {item.price.toFixed(2)} c/u
                      </Text>
                    </View>
                  </View>

                  <View style={styles.productRight}>
                    <Text style={styles.productTotal}>
                      Bs. {itemTotal.toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(index)}
                      style={styles.productRemove}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={COLORS.brand} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyProducts}>
              <Ionicons name="bag-outline" size={32} color={COLORS.textLight} />
              <Text style={styles.emptyProductsText}>Sin productos</Text>
            </View>
          )}
        </ScrollView>

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
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>
                Bs. {subtotal.toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.registerButton,
              !isFormValid && styles.registerButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || submitting}
            activeOpacity={0.9}
          >
            <View style={styles.registerBtnLeft}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.registerText}>
                {submitting ? "Procesando..." : "Registrar pedido"}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Modal transparent animationType="fade" visible={showSuccessModal}>
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successCard, { opacity: fadeAnim }]}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark" size={48} color="#fff" />
              </View>
              <Text style={styles.successTitle}>¡Pedido registrado!</Text>
              <Text style={styles.successDesc}>
                La orden se creó con éxito
              </Text>
             
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },

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
  heroTop: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
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

  clientCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.5,
  },
  clientLabel: {
    fontSize: 10,
    color: COLORS.textMid,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  clientName: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginTop: 1 },
  itemsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  itemsBadgeText: { fontSize: 12, fontWeight: "800", color: COLORS.brand },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  paymentTypeRow: { flexDirection: "row", gap: 8 },
  paymentTypeCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: "relative",
  },
  paymentTypeCardActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.dangerBg,
  },
  paymentTypeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentTypeLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textMid },
  paymentTypeLabelActive: { color: COLORS.brand, fontWeight: "800" },
  paymentTypeCheck: {
    position: "absolute",
    top: 6,
    right: 6,
  },

  termsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  termChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  termChipActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  termChipText: { fontSize: 12, fontWeight: "700", color: COLORS.textMid },
  termChipTextActive: { color: "#fff" },

  dueDateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.infoBg,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  dueDateLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.info,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dueDateValue: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 1,
  },

  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    alignItems: "center",
  },
  productImageWrapper: {
    width: 50,
    height: 60,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%" },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 17,
  },
  productMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBadge: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  qtyBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  productUnit: { fontSize: 11, color: COLORS.textMid, fontWeight: "600" },
  productRight: { alignItems: "flex-end", gap: 6 },
  productTotal: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  productRemove: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyProducts: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  emptyProductsText: {
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: "600",
    marginTop: 8,
  },

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

  registerButton: {
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
  registerButtonDisabled: {
    backgroundColor: COLORS.textLight,
    shadowOpacity: 0,
  },
  registerBtnLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  registerText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerOptionActive: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.brand,
  },
  pickerOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  pickerOptionTextActive: { color: COLORS.brand },

  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: COLORS.success,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: "500",
    marginBottom: 16,
    textAlign: "center",
  },
  successAmountBox: {
    backgroundColor: COLORS.successBg,
    width: "100%",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  successAmountLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  successAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.success,
  },
});