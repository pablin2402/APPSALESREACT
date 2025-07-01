import React, { useEffect, useState, useContext } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { API_URL } from "../config";
import { AuthContext } from "../AuthContext";
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

export default function AccountDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token, idOwner, idUser } = useContext(AuthContext);

  useEffect(() => {
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
        // manejar error si quieres
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container1, styles.horizontal]}>        
          <ActivityIndicator size="large" color="#D3423E" />
        </SafeAreaView>
      </SafeAreaProvider>
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
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>{displayName}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Correo Electrónico:</Text>
        <TextInput
          style={styles.readonlyInput}
          value={profile?.email || "Correo Electrónico no disponible"}
          editable={false}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Dirección:</Text>
        <TextInput
          style={styles.readonlyInput}
          value={profile?.client_location?.direction || "Dirección no disponible"}
          editable={false}
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Región:</Text>
        <TextInput
          style={styles.readonlyInput}
          value={profile?.region || "Región no disponible"}
          editable={false}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Rol:</Text>
        <TextInput
          style={styles.readonlyInput}
          value={profile?.role === "SALES" ? "Vendedor" : profile?.role || "Rol no disponible"}
          editable={false}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Teléfono:</Text>
        <TextInput
          style={styles.readonlyInput}
          value={profile?.phoneNumber || "Teléfono no disponible"}
          editable={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7E6E6",
    padding: 20,
    alignItems: "center",
  },
  container1: {
    flex: 1,
    justifyContent: 'center',
  },
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
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
  infoContainer: {
    width: "100%",
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  readonlyInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
  },
});
