import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL } from "../config";
import { AuthContext } from "../AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";

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
  dangerBg: "#fee2e2",
};

const InfoRow = ({ icon, iconBg, iconColor, label, value, isLast }) => (
  <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
    <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value || "No disponible"}
      </Text>
    </View>
  </View>
);

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token, idOwner, salesId } = useContext(AuthContext);

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
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingFull}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const displayName =
    profile?.fullName && profile?.lastName
      ? `${profile.fullName} ${profile.lastName}`
      : "Nombre no disponible";

  const initials =
    profile?.fullName && profile?.lastName
      ? `${profile.fullName[0]}${profile.lastName[0]}`.toUpperCase()
      : "?";

  const roleLabel = profile?.role === "SALES" ? "Vendedor" : profile?.role || "—";

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
      <View style={styles.container}>
        <View style={styles.heroWrapper}>
          <View style={styles.heroBg} />
          <SafeAreaView edges={["top"]}>
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Mi perfil</Text>
                  <Text style={styles.heroSubtitle}>
                    Información de tu cuenta
                  </Text>
                </View>
              
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
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
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>

            {profile?.region && (
              <View style={styles.regionRow}>
                <Ionicons name="location-sharp" size={12} color={COLORS.textMid} />
                <Text style={styles.regionText}>{profile.region}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Información de contacto</Text>

          <View style={styles.infoCard}>
            <InfoRow
              icon="mail"
              iconBg={COLORS.infoBg}
              iconColor={COLORS.info}
              label="Correo electrónico"
              value={profile?.email}
            />
            <InfoRow
              icon="call"
              iconBg={COLORS.successBg}
              iconColor={COLORS.success}
              label="Teléfono"
              value={profile?.phoneNumber}
            />
            <InfoRow
              icon="location"
              iconBg={COLORS.warningBg}
              iconColor={COLORS.warning}
              label="Dirección"
              value={profile?.client_location?.direction}
              isLast
            />
          </View>

          <Text style={styles.sectionTitle}>Información laboral</Text>

          <View style={styles.infoCard}>
            <InfoRow
              icon="briefcase"
              iconBg={COLORS.dangerBg}
              iconColor={COLORS.brand}
              label="Rol"
              value={roleLabel}
            />
            <InfoRow
              icon="map"
              iconBg={COLORS.infoBg}
              iconColor={COLORS.info}
              label="Región"
              value={profile?.region}
              isLast
            />
          </View>

          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85}>
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

  heroWrapper: { position: "relative", paddingBottom: 5 },
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
  heroContent: { paddingHorizontal: 5, paddingTop: 8, paddingBottom: 20 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
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
    padding: 20,
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
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
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

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 17,
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
    width: 36,
    height: 36,
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