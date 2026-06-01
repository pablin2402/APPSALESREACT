import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import moment from "moment";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL } from "../config";
import { AuthContext } from "../AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const DELIVERY_REGISTERED_KEY = "mapdelivery_delivery_registered";

export default function OrderPickUp() {
  const [date] = useState(new Date());
  const [imageUri, setImageUri] = useState(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { token, idOwner, salesId } = useContext(AuthContext);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });

  const onDeliveryRegistered = route.params?.onDeliveryRegistered;
  const client = route.params?.client;
  const routes = route.params?.route;

  const [file, setFile] = useState(null);

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

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a tus fotos para que puedas adjuntar el comprobante de pago.",
        [{ text: "Entendido" }]
      );
      return false;
    }
    return true;
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a la cámara para que puedas tomar una foto del comprobante.",
        [{ text: "Entendido" }]
      );
      return false;
    }
    return true;
  };

  const handlePickImageFromGallery = async () => {
    if (isSaving) return;
    setShowSourceModal(false);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const granted = await requestMediaLibraryPermission();
    if (!granted) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setFile({
          uri: asset.uri,
          name: asset.fileName || `comprobante_${Date.now()}.jpg`,
          type: asset.mimeType || asset.type || "image/jpeg",
        });
      }
    } catch (error) {
      Alert.alert("Error", "No pudimos abrir la galería. Intenta de nuevo.");
    }
  };

  const handleTakePhoto = async () => {
    if (isSaving) return;
    setShowSourceModal(false);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const granted = await requestCameraPermission();
    if (!granted) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setFile({
          uri: asset.uri,
          name: asset.fileName || `comprobante_${Date.now()}.jpg`,
          type: asset.mimeType || asset.type || "image/jpeg",
        });
      }
    } catch (error) {
      Alert.alert(
        "Error con la cámara",
        "No pudimos abrir la cámara. Verifica los permisos en los ajustes."
      );
    }
  };

  const openImageSourcePicker = () => {
    if (isSaving) return;
    Keyboard.dismiss();
    setShowSourceModal(true);
  };

  const removeImage = () => {
    if (isSaving) return;
    setImageUri(null);
    setFile(null);
  };

  const uploadImage = async () => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await axios.post(API_URL + "/whatsapp/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.imageUrl;
  };

  async function getUserLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisos denegados", "Necesitamos tu ubicación para registrar la entrega.");
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    const current = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setOrigin((prevOrigin) => {
      if (
        prevOrigin.latitude !== current.latitude ||
        prevOrigin.longitude !== current.longitude
      ) {
        return current;
      }
      return prevOrigin;
    });
    return current;
  }

  const uploadRoute = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        API_URL + "/whatsapp/route/delivery/id",
        {
          id_owner: idOwner,
          _id: routes,
          routeId: client._id,
          visitStatus1: "Pedido entregado",
        },
        { headers, timeout: 15000 }
      );

      await axios.post(
        API_URL + "/whatsapp/order/track",
        {
          orderId: client._id,
          eventType: "Pedido Entregado",
          triggeredBySalesman: "",
          triggeredByDelivery: salesId,
          triggeredByUser: "",
          location: { lat: 0, lng: 0 },
        },
        { headers, timeout: 15000 }
      );

      await axios.put(
        API_URL + "/whatsapp/order/status/confirm/id",
        {
          _id: client._id,
          id_owner: idOwner,
          orderStatus: "deliver",
        },
        { headers, timeout: 15000 }
      );
    } catch (error) {
    }
  };

  const handlePay = async () => {
    if (isSaving) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const imageUrl = file ? await uploadImage() : "";
      const userLocation = await getUserLocation();
      const payload = {
        image: imageUrl,
        delivery: salesId,
        clientName: note,
        longitud: userLocation.longitude,
        latitud: userLocation.latitude,
        orderId: client._id,
        id_owner: idOwner,
      };
      const response = await axios.post(
        API_URL + "/whatsapp/delivery/order/image",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.status === 200 || response.status === 201) {
        await AsyncStorage.setItem(DELIVERY_REGISTERED_KEY, "true");

        showModal();

        await uploadRoute();

        if (onDeliveryRegistered) {
          try {
            await onDeliveryRegistered();
          } catch (e) { }
        }

        setTimeout(() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("MapScreenDelivery");
          }
        }, 1400);
      }
    } catch (error) { }
    setIsSaving(false);
  };

  const getInitials = (name, lastName) => {
    return `${name?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const canSubmit = !!file && !!client && !isSaving;

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
                  disabled={isSaving}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Registrar entrega</Text>
                  <Text style={styles.heroSubtitle}>
                    Completa los datos del pedido
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 110,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {client && (
            <View style={styles.clientCard}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>
                  {getInitials(client.name, client.lastName)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clientLabel}>CLIENTE</Text>
                <Text style={styles.clientName} numberOfLines={1}>
                  {client.name} {client.lastName}
                </Text>
                {client.client_location?.direction && (
                  <View style={styles.clientAddressRow}>
                    <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                    <Text style={styles.clientAddress} numberOfLines={1}>
                      {client.client_location.direction}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Fecha de entrega</Text>
          <View style={styles.dateField}>
            <View style={styles.dateFieldIcon}>
              <Ionicons name="calendar" size={16} color={COLORS.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>HOY</Text>
              <Text style={styles.dateFieldValue}>
                {moment(date).format("D [de] MMMM, YYYY")}
              </Text>
            </View>
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={11} color={COLORS.textMid} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Persona que recibió</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Nombre de quien recibió el pedido..."
            placeholderTextColor={COLORS.textLight}
            style={styles.textArea}
            multiline
            numberOfLines={3}
            editable={!isSaving}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <Text style={styles.sectionTitle}>Comprobante de pago</Text>

          {imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageActionBtn}
                  onPress={openImageSourcePicker}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={14} color="#fff" />
                  <Text style={styles.imageActionText}>Cambiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageActionBtn, styles.imageActionBtnDanger]}
                  onPress={removeImage}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash" size={14} color="#fff" />
                  <Text style={styles.imageActionText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={openImageSourcePicker}
              style={styles.imageDrop}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <View style={styles.imageDropIcon}>
                <Ionicons name="cloud-upload" size={26} color={COLORS.brand} />
              </View>
              <Text style={styles.imageDropTitle}>Adjuntar comprobante</Text>
              <Text style={styles.imageDropSubtitle}>
                Toca para tomar foto o elegir de galería
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color={COLORS.info} />
            <Text style={styles.infoText}>
              Asegúrate de que la imagen sea clara, visible y fácil de entender.
            </Text>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + 12 },
          ]}
        >
          <TouchableOpacity
            onPress={handlePay}
            style={[
              styles.submitBtn,
              !canSubmit && styles.submitBtnDisabled,
            ]}
            activeOpacity={0.9}
          >
            {isSaving ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitBtnText}>Guardando...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Guardar entrega</Text>
              </>
            )}
          </TouchableOpacity>
          {!file && (
            <Text style={styles.submitHint}>
              Adjunta un comprobante para continuar
            </Text>
          )}
        </View>

        <Modal
          visible={showSourceModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSourceModal(false)}
        >
          <TouchableOpacity
            style={styles.sourceBackdrop}
            activeOpacity={1}
            onPress={() => setShowSourceModal(false)}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.sourceCard, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.sourceHandle} />
                <Text style={styles.sourceTitle}>Adjuntar comprobante</Text>
                <Text style={styles.sourceSubtitle}>
                  ¿De dónde quieres obtener la imagen?
                </Text>

                <TouchableOpacity
                  style={styles.sourceOption}
                  onPress={handleTakePhoto}
                  activeOpacity={0.85}
                >
                  <View
                    style={[styles.sourceOptionIcon, { backgroundColor: COLORS.infoBg }]}
                  >
                    <Ionicons name="camera" size={22} color={COLORS.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceOptionTitle}>Tomar foto</Text>
                    <Text style={styles.sourceOptionSubtitle}>
                      Usar la cámara
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sourceOption}
                  onPress={handlePickImageFromGallery}
                  activeOpacity={0.85}
                >
                  <View
                    style={[styles.sourceOptionIcon, { backgroundColor: COLORS.successBg }]}
                  >
                    <Ionicons name="images" size={22} color={COLORS.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceOptionTitle}>Elegir de galería</Text>
                    <Text style={styles.sourceOptionSubtitle}>
                      Buscar en tus fotos
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sourceCancel}
                  onPress={() => setShowSourceModal(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sourceCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

        <Modal transparent animationType="fade" visible={showSuccessModal}>
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successCard, { opacity: fadeAnim }]}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark" size={48} color="#fff" />
              </View>
              <Text style={styles.successTitle}>¡Entrega registrada!</Text>
              <Text style={styles.successDesc}>
                Vuelve al mapa para finalizar el trayecto
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

  heroWrapper: { position: "relative", paddingBottom: 14 },
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

  clientCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: -10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  clientName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 1,
  },
  clientAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  clientAddress: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textMid,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  dateField: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateFieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  dateFieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dateFieldValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 1,
  },
  lockBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },

  imageDrop: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.brand,
    borderStyle: "dashed",
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  imageDropIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  imageDropTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  imageDropSubtitle: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    textAlign: "center",
  },

  imagePreviewWrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
  },
  imageActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  imageActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.text,
  },
  imageActionBtnDanger: {
    backgroundColor: COLORS.brand,
  },
  imageActionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: COLORS.infoBg,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.info,
    fontWeight: "600",
    lineHeight: 16,
  },

  textArea: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 10,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.textLight,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  submitHint: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },

  sourceBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sourceCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sourceHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  sourceTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  sourceSubtitle: {
    fontSize: 12,
    color: COLORS.textMid,
    fontWeight: "500",
    marginBottom: 16,
  },
  sourceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sourceOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sourceOptionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  sourceOptionSubtitle: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 1,
  },
  sourceCancel: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.borderLight,
    alignItems: "center",
  },
  sourceCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textMid,
  },

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
    textAlign: "center",
  },
});