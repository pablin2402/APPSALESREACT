import React, { useEffect, useRef, useCallback, useState, useContext } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
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
  dangerBg: "#fee2e2",
};

const ShimmerBlock = ({ width, height, style, radius = 8 }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 250],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: "#e5e7eb",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: 100,
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.6)",
          transform: [{ translateX }, { skewX: "-20deg" }],
        }}
      />
    </View>
  );
};

const SkeletonClientCard = () => (
  <View style={styles.skeletonCard}>
    <ShimmerBlock width={54} height={54} radius={27} />
    <View style={{ flex: 1, gap: 6 }}>
      <ShimmerBlock width={150} height={14} radius={5} />
      <ShimmerBlock width={200} height={11} radius={4} />
      <ShimmerBlock width={100} height={18} radius={999} style={{ marginTop: 2 }} />
    </View>
    <ShimmerBlock width={32} height={32} radius={10} />
  </View>
);

export default function ClientScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token, salesId, idOwner } = useContext(AuthContext);

  const [searchTerm, setSearchTerm] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const range = 2;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const fetchOrders = useCallback(
    async (pageNumber, search) => {
      setLoading(true);
      try {
        const payload = {
          id_user: idOwner,
          salesId: salesId,
          page: pageNumber,
          limit: 10,
          search: search,
        };
        const response = await axios.post(
          API_URL + "/whatsapp/client/sales",
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSalesData(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalClients(
          response.data.totalRecords ||
            response.data.total ||
            (response.data.data?.length || 0)
        );
      } catch (error) {
        console.error(
          "Error fetching orders:",
          error.response ? error.response.data : error.message
        );
      } finally {
        setLoading(false);
      }
    },
    [token, idOwner, salesId]
  );

  useEffect(() => {
    fetchOrders(page, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const goToClientDetails = (client) => {
    navigation.navigate("ClientDetailsScreen", { client: client._id });
  };

  const getInitials = (name, lastName) => {
    return `${name?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

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
                  <Text style={styles.heroTitle}>Mis clientes</Text>
                  <Text style={styles.heroSubtitle}>
                    {loading
                      ? "Cargando clientes..."
                      : `${salesData.length} ${
                          salesData.length === 1
                            ? "cliente en esta página"
                            : "clientes en esta página"
                        }`}
                  </Text>
                </View>
                <View style={styles.heroIconBox}>
                  <Ionicons name="people" size={18} color="#fff" />
                </View>
              </View>

              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={COLORS.textMid} />
                <TextInput
                  placeholder="Buscar por nombre o apellido..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  style={styles.searchInput}
                  placeholderTextColor={COLORS.textLight}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    setPage(1);
                    fetchOrders(1, searchTerm);
                  }}
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchTerm("");
                      fetchOrders(1, "");
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>

        {loading ? (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 80,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonClientCard key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={salesData}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 80,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="people-outline" size={36} color={COLORS.textLight} />
                </View>
                <Text style={styles.emptyTitle}>Sin clientes</Text>
                <Text style={styles.emptyDesc}>
                  No encontramos clientes con esta búsqueda
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.clientCard}
                onPress={() => goToClientDetails(item)}
                activeOpacity={0.85}
              >
                <View style={styles.avatarWrapper}>
                  {item.identificationImage ? (
                    <Image
                      source={{ uri: item.identificationImage }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>
                        {getInitials(item.name, item.lastName)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.avatarStatusDot} />
                </View>

                <View style={styles.clientInfo}>
                  <Text style={styles.clientName} numberOfLines={1}>
                    {item.name} {item.lastName}
                  </Text>
                  <View style={styles.clientLocationRow}>
                    <Ionicons name="location-sharp" size={11} color={COLORS.brand} />
                    <Text style={styles.clientLocation} numberOfLines={2}>
                      {item.client_location?.direction || "Sin dirección"}
                    </Text>
                  </View>

                  {item.phoneNumber && (
                    <View style={styles.clientChip}>
                      <Ionicons name="call-outline" size={10} color={COLORS.textMid} />
                      <Text style={styles.clientChipText}>{item.phoneNumber}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.chevronWrap}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.brand} />
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {!loading && totalPages > 1 && (
          <View style={[styles.paginationBar, { paddingBottom: insets.bottom + 10 }]}>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              style={[styles.pageNavBtn, page === 1 && styles.pageNavBtnDisabled]}
            >
              <Ionicons
                name="chevron-back"
                size={16}
                color={page === 1 ? COLORS.textLight : COLORS.brand}
              />
            </TouchableOpacity>

            {pagesToShow.map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => setPage(num)}
                style={[styles.pageBtn, page === num && styles.pageBtnActive]}
              >
                <Text
                  style={page === num ? styles.pageTextActive : styles.pageText}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              style={[
                styles.pageNavBtn,
                page === totalPages && styles.pageNavBtnDisabled,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={page === totalPages ? COLORS.textLight : COLORS.brand}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  heroWrapper: { position: "relative", paddingBottom: 16 },
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
  heroContent: { paddingHorizontal: 20, paddingTop: 8 },
  heroTop: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroIconBox: {
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

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },

  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  avatarWrapper: { position: "relative" },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.borderLight,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.5,
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: "#fff",
  },

  clientInfo: { flex: 1 },
  clientName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  clientLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginBottom: 6,
  },
  clientLocation: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMid,
    fontWeight: "500",
    lineHeight: 16,
  },
  clientChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  clientChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMid,
  },

  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textMid,
    marginTop: 4,
    textAlign: "center",
  },

  paginationBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pageNavBtnDisabled: { opacity: 0.5 },
  pageBtn: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pageBtnActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  pageText: { fontSize: 13, fontWeight: "700", color: COLORS.textMid },
  pageTextActive: { fontSize: 13, fontWeight: "800", color: "#fff" },

  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    gap: 12,
  },
});