import React , {useContext, useState, useEffect }from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import axios from "axios";
import { API_URL } from "../config";

import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext";

export default function SalesManInfoPage() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logout,idOwner,idUser,token } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.post(API_URL + "/whatsapp/sales/id", {
          id_owner: idOwner, 
          _id: idUser, 
        },{
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setProfile(response.data);
      } catch (error) {
        console.error("Error al obtener los datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);
  const handleLogout = async () => {
    try {
      await logout();

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
      
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.profileContainer}>
        <Image source={{ uri: profile?.identificationImage }} style={styles.profileImage} />
        <Text style={styles.userName}>{profile?.fullName+" "+profile?.lastName || "Nombre no disponible"}</Text>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.option} onPress={() => navigation.navigate("PaymentScreen")}>
          <Ionicons name="cash-outline" size={24} color="black" />
          <Text style={styles.optionText}>Cobros</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={() => navigation.navigate("AccountScreen")}>
          <Ionicons name="person-circle-outline" size={24} color="black" />
          <Text style={styles.optionText}>Cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={() => navigation.navigate("ClientScreen")}>
          <Ionicons name="people-outline" size={24} color="black" />
          <Text style={styles.optionText}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={() => navigation.navigate("MapScreenRoute")}>
          <Ionicons name="map-outline" size={24} color="black" />
          <Text style={styles.optionText}>Mi Ruta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={() => navigation.navigate("SalesInformScreen")}>
          <Ionicons name="bar-chart-outline" size={24} color="black" />
          <Text style={styles.optionText}>Total de ventas</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#D3423E" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  userName: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
  optionsContainer: {
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    fontWeight: "bold",

  },
  optionText: {
    color: "black",
    fontSize: 16,
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  logoutText: {
    color: "#D3423E",
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "bold",
  },
  
});