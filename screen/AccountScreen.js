import React, { useEffect, useState, useContext } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import axios from "axios";
import { API_URL } from "../config";
import { AuthContext } from "../AuthContext";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token,idOwner,idUser } = useContext(AuthContext);

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
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D3423E" />
      </View>
    );
  }
  const displayName =
  profile?.fullName && profile?.lastName
    ? `${profile.fullName} ${profile.lastName}`
    : "Nombre no disponible";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.profileContainer}>
        <Image
          source={{ uri: profile?.identificationImage || "https://via.placeholder.com/100" }}
          style={styles.identificationImage}
        />
<Text style={styles.profileName}>{displayName}</Text>


      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Correo Electrónico:</Text>
        <Text style={styles.value}>{profile?.email || "Correo Electrónico no disponible"}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Dirección:</Text>
        <Text style={styles.value}>{profile?.client_location?.direction || "Dirección no disponible"}</Text>
      </View> 
   
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Región:</Text>
        <Text style={styles.value}>{profile?.region || "Region no disponible"}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Rol:</Text>
        <Text style={styles.value}>
          {profile?.role === "SALES" ? "Vendedor" : profile?.role || "Rol no disponible"}
        </Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Teléfono:</Text>
        <Text style={styles.value}>{profile?.phoneNumber || "Teléfono no disponible"}</Text>
      </View> 
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 50,
  },
  
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#D3423E",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
  },
  profileEmail: {
    fontSize: 16,
    color: "#8696A0",
  },
  infoContainer: {
    width: "100%",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  label: {
    fontSize: 16,
    color: "#8696A0",
  },
  value: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});
