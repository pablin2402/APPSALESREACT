import React, { useContext, useState, useEffect } from "react";
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
  const { logout, idOwner, idUser, token } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const { setIsAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.post(
          API_URL + "/whatsapp/sales/id",
          {
            id_owner: idOwner,
            _id: idUser,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            }
          }
        );
        setProfile(response.data);
      } catch (error) {
        console.error("Error al obtener los datos:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.profileContainer}>
        <Image source={{ uri: profile?.identificationImage }} style={styles.profileImage} />
        <Text style={styles.userName}>
          {profile?.fullName + " " + profile?.lastName || "Nombre no disponible"}
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        <Option icon="cash-outline" text="Cobros" onPress={() => navigation.navigate("PaymentScreen")} />
        <Option icon="person-circle-outline" text="Cuenta" onPress={() => navigation.navigate("AccountScreen")} />
        <Option icon="people-outline" text="Clientes" onPress={() => navigation.navigate("ClientScreen")} />
        <Option icon="map-outline" text="Mi Ruta" onPress={() => navigation.navigate("MapScreenRoute")} />
        <Option icon="bar-chart-outline" text="Total de ventas" onPress={() => navigation.navigate("SalesInformScreen")} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#D3423E" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const Option = ({ icon, text, onPress }) => (
  <TouchableOpacity style={styles.optionCard} onPress={onPress}>
    <Ionicons name={icon} size={22} color="#333" />
    <Text style={styles.optionText}>{text}</Text>
  </TouchableOpacity>
);

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
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
  },
  optionsContainer: {
    gap: 15,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 15,
    color: "#333",
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    justifyContent: "center",
  },
  logoutText: {
    marginLeft: 8,
    color: "#D3423E",
    fontSize: 16,
    fontWeight: "600",
  },
});
