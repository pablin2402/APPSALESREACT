import React, { useState, useContext } from "react";
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext";
import icon from "../images/LOGO.png";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigation = useNavigation();
  const { login } = useContext(AuthContext);

  const handleSubmit = async () => {
    try {
      const response = await axios.post(API_URL + "/whatsapp/login", {
        email,
        password,
      });
  
      if (response.status === 200) {
        const { token, usuarioDB } = response.data;
  
  
          await AsyncStorage.setItem("token", token);
          await AsyncStorage.setItem("id_owner", usuarioDB.id_owner);
          await AsyncStorage.setItem("id_user", usuarioDB.salesMan);
         // await AsyncStorage.setItem("role", usuarioDB.role);
          await AsyncStorage.setItem("sales_id", usuarioDB._id);
  
          await login(token, usuarioDB.id_owner, usuarioDB.salesMan, usuarioDB.role, usuarioDB._id);
        }
      
    } catch (err) {
      const message = err.response?.data?.message || "Usuario o contraseña incorrectos";
      setErrorMessage(message);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.card}>
      <Image
          source={icon} 
          resizeMode="contain"
          style={styles.image}
        />
        <TextInput
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          placeholderTextColor="#999"
        />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D3423E",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#D3423E",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D3423E",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    color: "#000",
  },
  error: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#D3423E",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  image: {
    width: "100%",
    height: 120,
    marginBottom: 20,
  },
});
