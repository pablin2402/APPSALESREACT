import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL } from "../config";
import { AuthContext } from "../AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";

const COLORS = {
  brand: "#D3423E",
  brandDark: "#bb3330",
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e5e7eb",
  borderLight: "#f1f5f9",
  text: "#111827",
  textMid: "#6b7280",
  textLight: "#9ca3af",
  success: "#16a34a",
  successBg: "#dcfce7",
  dangerBg: "#fee2e2",
};

export default function AddPayment() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();

  const { token, idOwner, idUser } = useContext(AuthContext);

  const client = route.params?.client;
  const order = route.params?.order;
  const debt = route.params?.debt;

  const [amount, setAmount] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const showModal = () => {
    setShowSuccessModal(true);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShowSuccessModal(false);
      });
    }, 2500);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);

      setFile({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName || `payment_${Date.now()}.jpg`,
        type: result.assets[0].mimeType || "image/jpeg",
      });
    }
  };

  const uploadImage = async () => {
    const formData = new FormData();

    formData.append("image", file);

    const res = await axios.post(
      API_URL + "/whatsapp/upload/image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return res.data.imageUrl;
  };

  const handleChange = (text) => {
    let numericValue = text.replace(/[^0-9.]/g, "");

    if (numericValue === "") {
      setAmount("");
      return;
    }

    const parsedValue = parseFloat(numericValue);

    if (!isNaN(parsedValue)) {
      if (parsedValue > debt) {
        setAmount(debt.toString());
      } else {
        setAmount(numericValue);
      }
    }
  };

  const handlePay = async () => {
    try {
      setLoading(true);

      const imageUrl = file ? await uploadImage() : "";

      const jsonData = {
        saleImage: imageUrl,
        total: amount,
        note,
        orderId: order,
        numberOrden: "",
        paymentStatus: "paid",
        id_client: client,
        sales_id: idUser,
        delivery_id: null,
        id_owner: idOwner,
      };

      const orderResponse = await Promise.race([
        axios.post(API_URL + "/whatsapp/order/pay", jsonData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 10000)
        ),
      ]);

      if (orderResponse.status === 200) {
        showModal();

        setAmount("");
        setNote("");
        setImageUri(null);

        navigation.navigate("PaymentScreen");

        try {
          await axios.post(
            API_URL + "/whatsapp/order/track",
            {
              orderId: order,
              eventType: "Pago Ingresado",
              triggeredBySalesman: idUser,
              triggeredByDelivery: "",
              triggeredByUser: "",
              location: {
                lat: 1,
                lng: 1,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch (error) {
          console.error("Error al enviar evento:", error);
        }
      }
    } catch (error) {
      console.error("Error al registrar el pago", error);
    } finally {
      setLoading(false);
    }
  };

  const disabledButton =
    !amount ||
    !file ||
    !client ||
    !order ||
    parseFloat(amount) <= 0 ||
    parseFloat(amount) > parseFloat(debt);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.brand}
        />

        <View style={styles.header}>
          <View style={styles.headerBg} />

          <View
            style={[
              styles.headerContent,
              {
                paddingTop: insets.top + 10,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>

            <View style={{ marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Registrar pago</Text>
              <Text style={styles.headerSubtitle}>
                Confirma el ingreso del pago
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 120,
          }}
        >
          <View style={styles.balanceCard}>
            <View style={styles.balanceIcon}>
              <Ionicons name="wallet" size={18} color={COLORS.brand} />
            </View>

            <Text style={styles.balanceLabel}>Saldo pendiente</Text>

            <Text style={styles.balanceAmount}>
              Bs. {Number(debt || 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={COLORS.brand}
              />
              <Text style={styles.label}>Fecha de transacción</Text>
            </View>

            <View style={styles.readonlyInput}>
              <Text style={styles.readonlyText}>
                {new Date().toLocaleDateString("es-BO", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>HOY</Text>
              </View>
            </View>

            <Text style={styles.helperText}>
              La fecha se registra automáticamente al momento del pago.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Ionicons
                name="cash-outline"
                size={14}
                color={COLORS.success}
              />
              <Text style={styles.label}>Monto recibido</Text>
            </View>

            <View style={styles.amountWrapper}>
              <Text style={styles.currency}>Bs.</Text>

              <TextInput
                value={amount}
                onChangeText={handleChange}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <Text style={styles.helperText}>
              Ingresa el monto exacto recibido del cliente.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Ionicons
                name="image-outline"
                size={14}
                color={COLORS.warning}
              />
              <Text style={styles.label}>Comprobante de pago</Text>
            </View>

            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.85}
              style={styles.uploadBox}
            >
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.image} />

                  <View style={styles.imageOverlay}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.imageOverlayText}>
                      Imagen cargada
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.uploadIcon}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={24}
                      color={COLORS.brand}
                    />
                  </View>

                  <Text style={styles.uploadTitle}>
                    Subir comprobante
                  </Text>

                  <Text style={styles.uploadSubtitle}>
                    JPG, PNG o imagen clara del pago
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.tipBox}>
              <Ionicons
                name="information-circle"
                size={14}
                color={COLORS.brand}
              />

              <Text style={styles.tipText}>
                Verifica que el comprobante sea legible y visible.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Ionicons
                name="person-outline"
                size={14}
                color={COLORS.info}
              />
              <Text style={styles.label}>Persona que realizó el pago</Text>
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Ej: Juan Pérez"
              placeholderTextColor="#9ca3af"
              style={styles.textArea}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
            />

            <Text style={styles.helperText}>
              Agrega una referencia rápida del pago.
            </Text>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 15,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handlePay}
            disabled={disabledButton || loading}
            activeOpacity={0.9}
            style={[
              styles.payBtn,
              (disabledButton || loading) && styles.payBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.payBtnText}>Confirmar pago</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Modal transparent animationType="fade" visible={showSuccessModal}>
          <View style={styles.modalBackdrop}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <View style={styles.modalIcon}>
                <Ionicons
                  name="checkmark-done-circle"
                  size={56}
                  color={COLORS.success}
                />
              </View>

              <Text style={styles.modalTitle}>
                Pago registrado correctamente
              </Text>

              <Text style={styles.modalSubtitle}>
                El pago fue guardado exitosamente.
              </Text>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    position: "relative",
    paddingBottom: 18,
  },

  headerBg: {
    position: "absolute",
    backgroundColor: COLORS.brand,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerContent: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },

  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    marginTop: -10,
    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  balanceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  balanceLabel: {
    fontSize: 11,
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
  },

  balanceAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.brand,
    marginTop: 5,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },

  label: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  readonlyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  readonlyText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  todayBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  todayBadgeText: {
    fontSize: 9,
    color: COLORS.success,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  helperText: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 8,
    lineHeight: 16,
    fontWeight: "500",
  },

  amountWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },

  currency: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.brand,
    marginRight: 8,
  },

  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    paddingVertical: 14,
  },

  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 18,
    height: 190,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#fafafa",
  },

  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  uploadTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  uploadSubtitle: {
    fontSize: 10,
    color: COLORS.textMid,
    marginTop: 4,
    fontWeight: "500",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  imageOverlayText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  tipBox: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 10,
  },

  tipText: {
    flex: 1,
    fontSize: 10,
    color: COLORS.textMid,
    lineHeight: 15,
    fontWeight: "500",
  },

  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: "#fff",
    fontWeight: "600",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  payBtn: {
    backgroundColor: COLORS.brand,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },

  payBtnDisabled: {
    backgroundColor: "#d1d5db",
  },

  payBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 290,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
  },

  modalIcon: {
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  modalSubtitle: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textMid,
    textAlign: "center",
    lineHeight: 18,
  },
});