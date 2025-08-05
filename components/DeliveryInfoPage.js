import React, { useContext, useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext";

export default function DeliveryInfoPage() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setIsAuthenticated, logout, idOwner, token, idUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await axios.post(API_URL + "/whatsapp/delivery/id", {
        id_owner: idOwner,
        id: idUser,
      }, {
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
  useEffect(() => {
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
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D3423E" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      ) : (
        <View style={styles.profileContainer}>
          <Image 
          source={{ uri: profile?.identificationImage || "https://via.placeholder.com/100" }}
          style={styles.profileImage} 
          />
          <Text style={styles.userName}>
            {profile?.fullName && profile?.lastName 
              ? `${profile.fullName} ${profile.lastName}` 
              : "Nombre no disponible"}
          </Text>
        </View>
      )}

      <View style={styles.optionsContainer}>
        <Option icon="cash-outline" text="Cobros" onPress={() => navigation.navigate("DeliverPaymentScreen")} />
        <Option icon="person-circle-outline" text="Cuenta" onPress={() => navigation.navigate("AccountDeliveryScreen")} />
        <Option icon="map-outline" text="Mi Ruta" onPress={() => navigation.navigate("MapScreenDelivery")} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#D3423E" />
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
  optionsContainer: {
    gap: 15,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
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
  profileContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 30,
    marginBottom: 30,   
    backgroundColor: "#f2f2f2",
  },
  userName: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  optionText: {
    color: "black",
    fontSize: 16,
    marginLeft: 10,
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
