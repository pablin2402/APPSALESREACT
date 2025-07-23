import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Platform, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { Keyboard, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext";
import { Modal, Animated } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Location from "expo-location";

export default function OrderPickUp() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [note, setNote] = useState('');
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { token, idOwner, idUser } = useContext(AuthContext);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });

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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setFile({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName,
        type: result.assets[0].type,
      });
    }
  };
  const uploadImage = async () => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await axios.post(API_URL + "/whatsapp/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.imageUrl;
  };
  async function getUserLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert("Permisos denegados");
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    const current = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
    setOrigin(prevOrigin => {
      if (prevOrigin.latitude !== current.latitude || prevOrigin.longitude !== current.longitude) {
        return current;
      }
      return prevOrigin;
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  }
  const uploadRoute = async () => {
    try {
        const res = await axios.put(API_URL + "/whatsapp/route/delivery/id", {
            id_owner: idOwner,
            _id: routes,
            routeId:client._id,
            visitStatus1: "Pedido entregado",
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (res.status === 200) {
            await axios.post(API_URL + "/whatsapp/order/track", {
                orderId: client._id,
                eventType: "Pedido Entregado",
                triggeredBySalesman: "",
                triggeredByDelivery: idUser,
                triggeredByUser: "",
                location: { lat: 0, lng: 0 }
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
    } catch (error) {
    }
};
  const handlePay = async () => {
    try {
      const imageUrl = file ? await uploadImage() : "";
      const userLocation = await getUserLocation();
      const latitudDelivery = userLocation.latitude;
      const longitudDelivery = userLocation.longitude;
      const payload = {
        image: imageUrl,
        delivery: idUser,
        clientName: note,
        longitud: longitudDelivery,
        latitud: latitudDelivery,
        orderId: client._id,
        id_owner: idOwner,
      };
      const response = await axios.post(API_URL + "/whatsapp/delivery/order/image", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200 || response.status === 201) {
        showModal();
        uploadRoute();
        navigation.navigate("MapDelivery");
      }
    } catch (error) {
    }
  };
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <Text style={styles.debtAmount}>{client.name + " " + client.lastName}</Text>
          <Text style={styles.label}>Fecha de entrega</Text>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.input}>
            <Text style={{ color: "#2E2B2B" }}>{moment(date).format('D MMM. YYYY')}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              placeholderTextColor="#2E2B2B"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              themeVariant="light"
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
          <Text style={styles.label}>Adjunta aquí una imagen del comprobante de pago</Text>
          <TouchableOpacity onPress={handlePickImage} style={styles.imageContainer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <Text style={{ color: '#FF2D55' }}>Imagen adjunta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Asegúrate de que la imagen que cargues sea clara, visible y fácil de entender.
            </Text>
          </View>

          <Text style={styles.label}>Persona que recibio el producto</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Escribe aquí..."
            style={styles.textArea}
            multiline
            numberOfLines={4}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit
          />
          <View style={{
            position: 'absolute',
            bottom: insets.bottom + 20,
            left: 20,
            right: 20,
          }}
          >
            <TouchableOpacity
              onPress={handlePay}
              disabled={!file || !client}
              style={{
                backgroundColor: !file || !client
                  ? "#ccc"
                  : "#D3423E",
                paddingVertical: 15,
                borderRadius: 25,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>Guardar</Text>
            </TouchableOpacity>

          </View>
        </View>

        <Modal
          transparent
          animationType="fade"
          visible={showSuccessModal}
        >
          <View style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}>
            <Animated.View
              style={{
                backgroundColor: "white",
                padding: 25,
                borderRadius: 20,
                alignItems: "center",
                opacity: fadeAnim,
                width: 250
              }}
            >
              <Ionicons name="checkmark-circle" size={64} color="#27AE60" />
              <Text style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#27AE60",
                marginTop: 10,
                textAlign: "center"
              }}>
                ¡Pago registrado con éxito!
              </Text>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 15,
  },
  description: {
    color: '#444',
    fontSize: 14,
    marginBottom: 25,
  },
  bold: {
    fontWeight: 'bold',
  },
  label: {
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 6,
    color: '#222',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B0B0B0",
    backgroundColor: "#fff",

  },

  imageContainer: {
    borderStyle: 'dashed',
    borderColor: "#B0B0B0",
    backgroundColor: "#fff",
    borderWidth: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderRadius: 8,
    marginTop: 5,
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  infoBox: {
    borderWidth: 1,
    borderColor: "#2E2B2B",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    borderColor: "#B0B0B0",
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B0B0B0",
    padding: 12,
    textColor: '#2E2B2B',
    backgroundColor: "#fff",
    marginTop: 5,
    textAlignVertical: 'top',
  },
  debtLabel: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  debtAmount: { fontSize: 32, fontWeight: "bold", marginBottom: 20 },
});
