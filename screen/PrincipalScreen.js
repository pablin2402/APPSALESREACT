import React, { useContext, useEffect, useState } from "react";
import { ScrollView, View, StyleSheet, Text, Platform, PermissionsAndroid, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../AuthContext";
import SalesPrincipalPage from "../components/SalesPrincipalPage";
import DeliveryPage from "../components/DeliveryPage";

export default function PrincipalScreen() {
  const { role } = useContext(AuthContext);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true); // Para manejar estado de "espera"

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (alreadyGranted) {
          setHasLocationPermission(true);
          setCheckingPermission(false);
          return;
        }

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Permiso de ubicación",
            message: "Esta app necesita acceso a tu ubicación para mostrar mapas.",
            buttonNeutral: "Pregúntame luego",
            buttonNegative: "Cancelar",
            buttonPositive: "OK",
          }
        );

        setHasLocationPermission(result === PermissionsAndroid.RESULTS.GRANTED);
        setCheckingPermission(false);
      } catch (err) {
        console.warn("Error solicitando permisos:", err);
        setHasLocationPermission(false);
        setCheckingPermission(false);
      }
    } else {
      setHasLocationPermission(true);
      setCheckingPermission(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      requestLocationPermission();
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
          {(role === "SALES" || role === "ADMIN") && <SalesPrincipalPage />}
        {role === "DELIVERY" && <DeliveryPage />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
});
