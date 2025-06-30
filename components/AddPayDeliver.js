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

export default function AddpayDeliver() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [note, setNote] = useState('');
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { token, idOwner, idUser } = useContext(AuthContext);

  const client = route.params?.client;
  const order = route.params?.order;
  const debt = route.params?.debt;

  const [file, setFile] = useState(null);

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
      const formData = new FormData();
      formData.append("saleImage", file);
      formData.append("total", amount);
      formData.append("note", note);
      formData.append("orderId", order);
      formData.append("numberOrden", "");
      formData.append("paymentStatus", "paid");
      formData.append("id_client", client);
      formData.append("sales_id", idUser);
      formData.append("id_owner", idOwner);
      const orderResponse = await Promise.race([

        axios.post(API_URL + "/whatsapp/order/pay", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
      ]);
      if (orderResponse.status === 200) {
        setAmount('');
        setNote('');
        setImageUri(null);
        navigation.navigate("SalesInformScreen");
        const lat = 1;
        const lng = 1;

        try {
          await axios.post(API_URL + "/whatsapp/order/track", {
            orderId: order,
            eventType: "Pago Ingresado",
            triggeredBySalesman: idUser,
            triggeredByDelivery: "",
            triggeredByUser: "",
            location: { lat, lng }
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

        } catch (error) {
          console.error("Error al enviar evento de orden:", error);
        } finally {
        }

        (error) => {
          console.error("No se pudo obtener la ubicación:", error);
        }


      }

    } catch (error) {
      console.error("Error al registrar el pago", error);
    }
  };
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Ingreso de pagos</Text>
        <Text style={styles.debtLabel}>Saldo pendiente:</Text>
        <Text style={styles.debtAmount}>Bs. {debt}</Text>
        <Text style={styles.label}>Fecha de la transacción</Text>
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

        <Text style={styles.label}>Monto del cargo</Text>
        <TextInput
          value={amount}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="0.00"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={Keyboard.dismiss}
        />

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

        <Text style={styles.label}>Descripción (opcional)</Text>
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
          disabled={!amount || !file || !client || !order || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(debt)}
          style={{
            backgroundColor: !amount || !file || !client || !order || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(debt)
              ? "#ccc"
              : "#D3423E",
            paddingVertical: 15,
            borderRadius: 25,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>Pagar</Text>
        </TouchableOpacity>

        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
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
    borderColor: 'black',
  },
  
  imageContainer: {
    borderStyle: 'dashed',
    borderColor: 'black',
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
    color: '#444',
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'black',    
    padding: 12,
    marginTop: 5,
    textAlignVertical: 'top',
  },
  debtLabel: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  debtAmount: { fontSize: 32, fontWeight: "bold", color: "#D3423E", marginBottom: 20 },
});
