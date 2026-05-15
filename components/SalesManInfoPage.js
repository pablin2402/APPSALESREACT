import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext";

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
  purple: "#9333ea",
  purpleBg: "#f3e8ff",
  pink: "#ec4899",
  pinkBg: "#fce7f3",
  dangerBg: "#fee2e2",
};

const MenuItem = ({ icon, iconBg, iconColor, title, subtitle, onPress, isLast }) => (
  <TouchableOpacity
    style={[styles.menuItem, !isLast && styles.menuItemBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
  </TouchableOpacity>
);

export default function SalesManInfoPage() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logout, idOwner, salesId, token, setIsAuthenticated } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.post(
          API_URL + "/whatsapp/sales/id",
          { id_owner: idOwner, _id: salesId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setProfile(response.data);
      } catch (error) {
        console.error("Error al obtener los datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const displayName =
    profile?.fullName && profile?.lastName
      ? `${profile.fullName} ${profile.lastName}`
      : "Nombre no disponible";

  const initials =
    profile?.fullName && profile?.lastName
      ? `${profile.fullName[0]}${profile.lastName[0]}`.toUpperCase()
      : "?";

 {loading && (
         <View style={styles.loadingContainer}>
           <View style={styles.loadingCard}>
             <ActivityIndicator size="large" color={COLORS.brand} />
             <Text style={styles.loadingText}>Cargando...</Text>
           </View>
         </View>
       )}

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
      <View style={styles.container}>
        <View style={styles.heroWrapper}>
          <View style={styles.heroBg} />
          <SafeAreaView edges={["top"]}>
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Mi cuenta</Text>
                  <Text style={styles.heroSubtitle}>
                    Gestiona tu información y accesos
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 30,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              {profile?.identificationImage ? (
                <Image
                  source={{ uri: profile.identificationImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="briefcase" size={11} color={COLORS.brand} />
              <Text style={styles.roleBadgeText}>
                {profile?.role === "SALES" ? "Vendedor" : profile?.role || "Vendedor"}
              </Text>
            </View>

            {profile?.region && (
              <View style={styles.regionRow}>
                <Ionicons name="location-sharp" size={12} color={COLORS.textMid} />
                <Text style={styles.regionText}>{profile.region}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Operaciones</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="cash"
              iconBg={COLORS.successBg}
              iconColor={COLORS.success}
              title="Cobros"
              subtitle="Gestiona los pagos recibidos"
              onPress={() => navigation.navigate("PaymentScreen")}
            />
            <MenuItem
              icon="people"
              iconBg={COLORS.infoBg}
              iconColor={COLORS.info}
              title="Clientes"
              subtitle="Lista de clientes asignados"
              onPress={() => navigation.navigate("ClientScreen")}
            />
            <MenuItem
              icon="map"
              iconBg={COLORS.warningBg}
              iconColor={COLORS.warning}
              title="Mi Ruta"
              subtitle="Ver las rutas del día"
              onPress={() => navigation.navigate("MapScreenRoute")}
              isLast
            />
          </View>

          <Text style={styles.sectionTitle}>Análisis</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="bar-chart"
              iconBg={COLORS.purpleBg}
              iconColor={COLORS.purple}
              title="Total de ventas"
              subtitle="Resumen de tus ventas"
              onPress={() => navigation.navigate("SalesInformScreen")}
              isLast
            />
          </View>

          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="person-circle"
              iconBg={COLORS.pinkBg}
              iconColor={COLORS.pink}
              title="Información personal"
              onPress={() => navigation.navigate("AccountScreen")}
              isLast
            />
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <View style={styles.logoutLeft}>
              <View style={styles.logoutIcon}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.brand} />
              </View>
              <View>
                <Text style={styles.logoutText}>Cerrar sesión</Text>
                <Text style={styles.logoutSubtext}>Salir de tu cuenta</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>

          <Text style={styles.versionText}>Versión 1.0.0</Text>
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMid,
    fontSize: 13,
    fontWeight: "500",
  },

  heroWrapper: { position: "relative", paddingBottom: 10 },
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
  heroContent: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 10 },
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

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    marginTop: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 1,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  regionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  regionText: { fontSize: 12, color: COLORS.textMid, fontWeight: "600" },

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

  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 2,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: { fontSize: 14, fontWeight: "800", color: COLORS.brand },
  logoutSubtext: {
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: "500",
    marginTop: 1,
  },

  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: "600",
    marginTop: 24,
  },
});