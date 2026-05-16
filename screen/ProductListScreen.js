import React, { useEffect, useContext, useState, useCallback, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import axios from "axios";
import { API_URL } from "../config";
import { useSafeAreaInsets, SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
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
  dangerBg: "#fee2e2",
};

const ShimmerBlock = ({ width: w, height: h, style, radius = 8 }) => {
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
          width: w,
          height: h,
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

const SkeletonProductCard = ({ cardWidth }) => (
  <View style={[styles.card, { width: cardWidth }]}>
    <ShimmerBlock width="100%" height={110} radius={0} />
    <View style={{ padding: 10 }}>
      <ShimmerBlock width={60} height={9} radius={4} style={{ marginBottom: 6 }} />
      <ShimmerBlock width="90%" height={13} radius={5} style={{ marginBottom: 4 }} />
      <ShimmerBlock width="70%" height={13} radius={5} style={{ marginBottom: 10 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ gap: 4 }}>
          <ShimmerBlock width={36} height={8} radius={3} />
          <ShimmerBlock width={60} height={15} radius={5} />
        </View>
        <ShimmerBlock width={32} height={32} radius={10} />
      </View>
    </View>
  </View>
);

const SkeletonChip = ({ w }) => (
  <ShimmerBlock width={w} height={32} radius={999} />
);

export default function ProductListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
  const { token, idOwner } = useContext(AuthContext);

  const [salesData, setSalesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState([]);

  const cardWidth = (width - 20 * 2 - 12) / 2;

  const cartTotalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotalAmount = cart.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  const goToCartDetails = () => {
    navigation.navigate("CartDetailsScreen", { carts: cart });
  };

  const isInCart = (productId) => cart.some((i) => i._id === productId);

  const toggleCart = (product) => {
    if (isInCart(product._id)) {
      setCart(cart.filter((i) => i._id !== product._id));
    } else {
      setCart([
        ...cart,
        { ...product, quantity: 1, price: product.priceId?.price || 0 },
      ]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.post(
        API_URL + "/whatsapp/category/id",
        { userId: idOwner, id_owner: idOwner, page: 1, limit: 1000 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategories(res.data.data || []);
    } catch (error) {
      console.error("Error categorias:", error);
    }
  };

  const fetchProducts = useCallback(
    async (pageNumber, search, category) => {
      setLoading(true);
      try {
        const response = await axios.post(
          API_URL + "/whatsapp/product/id",
          {
            id_user: idOwner,
            status: false,
            page: pageNumber,
            limit: 8,
            search: search,
            category: category,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSalesData(response.data.products || []);
        setTotalPages(response.data.totalPages || 1);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [token, idOwner]
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts(page, searchTerm, selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedCategory]);

  const range = 2;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const renderProduct = ({ item }) => {
    const selected = isInCart(item._id);
    return (
      <TouchableOpacity
        style={[styles.card, { width: cardWidth }, selected && styles.cardSelected]}
        onPress={() => toggleCart(item)}
        activeOpacity={0.85}
      >
        <View style={styles.imageWrapper}>
          {item.productImage ? (
            <Image
              source={{ uri: item.productImage }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={COLORS.textLight} />
            </View>
          )}

          {selected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.category} numberOfLines={1}>
            {item.categoryId?.categoryName || "Sin categoría"}
          </Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName || "Sin nombre"}
          </Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Precio</Text>
              <Text style={styles.price}>
                Bs. {Number(item.priceId?.price || 0).toFixed(2)}
              </Text>
            </View>

            <View style={[styles.toggleBtn, selected && styles.toggleBtnActive]}>
              <Ionicons
                name={selected ? "checkmark" : "add"}
                size={18}
                color={selected ? "#fff" : COLORS.brand}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>Productos</Text>
                  <Text style={styles.heroSubtitle}>
                    Selecciona productos para tu pedido
                  </Text>
                </View>
                {cart.length > 0 && (
                  <TouchableOpacity
                    style={styles.cartIconBtn}
                    onPress={goToCartDetails}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="bag-outline" size={20} color="#fff" />
                    <View style={styles.cartIconBadge}>
                      <Text style={styles.cartIconBadgeText}>
                        {cartTotalItems}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={COLORS.textMid} />
                <TextInput
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  style={styles.searchInput}
                  placeholderTextColor={COLORS.textLight}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    setPage(1);
                    fetchProducts(1, searchTerm, selectedCategory);
                  }}
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchTerm("");
                      fetchProducts(1, "", selectedCategory);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={COLORS.textLight}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>

        {loading ? (
          <>
            <View style={styles.chipsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsContainer}
              >
                <SkeletonChip w={70} />
                <SkeletonChip w={90} />
                <SkeletonChip w={80} />
                <SkeletonChip w={100} />
                <SkeletonChip w={75} />
              </ScrollView>
            </View>
            <View style={styles.skeletonGrid}>
              <View style={styles.skeletonRow}>
                <SkeletonProductCard cardWidth={cardWidth} />
                <SkeletonProductCard cardWidth={cardWidth} />
              </View>
              <View style={styles.skeletonRow}>
                <SkeletonProductCard cardWidth={cardWidth} />
                <SkeletonProductCard cardWidth={cardWidth} />
              </View>
              <View style={styles.skeletonRow}>
                <SkeletonProductCard cardWidth={cardWidth} />
                <SkeletonProductCard cardWidth={cardWidth} />
              </View>
            </View>
          </>
        ) : (
          <>
            {categories.length > 0 && (
              <View style={styles.chipsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      selectedCategory === "" && styles.chipActive,
                    ]}
                    onPress={() => {
                      setSelectedCategory("");
                      setPage(1);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="apps-outline"
                      size={13}
                      color={selectedCategory === "" ? "#fff" : COLORS.textMid}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        selectedCategory === "" && styles.chipTextActive,
                      ]}
                    >
                      Todos
                    </Text>
                  </TouchableOpacity>

                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat._id;
                    return (
                      <TouchableOpacity
                        key={cat._id}
                        style={[styles.chip, isActive && styles.chipActive]}
                        onPress={() => {
                          setSelectedCategory(cat._id);
                          setPage(1);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isActive && styles.chipTextActive,
                          ]}
                        >
                          {cat.categoryName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <FlatList
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: cart.length > 0 ? insets.bottom + 100 : insets.bottom + 24,
              }}
              data={salesData}
              keyExtractor={(item) => item._id}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: "space-between", gap: 12 }}
              showsVerticalScrollIndicator={false}
              renderItem={renderProduct}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons
                    name="search-outline"
                    size={48}
                    color={COLORS.textLight}
                  />
                  <Text style={styles.emptyTitle}>Sin resultados</Text>
                  <Text style={styles.emptyDesc}>
                    No encontramos productos con ese filtro
                  </Text>
                </View>
              }
              ListFooterComponent={
                totalPages > 1 ? (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      onPress={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      style={[
                        styles.pageNavBtn,
                        page === 1 && styles.pageNavBtnDisabled,
                      ]}
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
                        style={[
                          styles.pageBtn,
                          page === num && styles.pageBtnActive,
                        ]}
                      >
                        <Text
                          style={
                            page === num
                              ? styles.pageTextActive
                              : styles.pageText
                          }
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      onPress={() =>
                        setPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={page === totalPages}
                      style={[
                        styles.pageNavBtn,
                        page === totalPages && styles.pageNavBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={
                          page === totalPages ? COLORS.textLight : COLORS.brand
                        }
                      />
                    </TouchableOpacity>
                  </View>
                ) : null
              }
              keyboardShouldPersistTaps="handled"
            />
          </>
        )}

        {cart.length > 0 && !loading && (
          <TouchableOpacity
            onPress={goToCartDetails}
            style={[
              styles.floatingPayButton,
              { bottom: insets.bottom + 16 },
            ]}
            activeOpacity={0.9}
          >
            <View style={styles.payLeft}>
              <View style={styles.payBadge}>
                <Text style={styles.payBadgeText}>{cartTotalItems}</Text>
              </View>
              <Text style={styles.payText}>Ver mi carrito</Text>
            </View>
            <View style={styles.payRight}>
              <Text style={styles.payAmount}>
                Bs. {cartTotalAmount.toFixed(2)}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
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
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  cartIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartIconBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.brand,
  },
  cartIconBadgeText: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "800",
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

  chipsWrapper: { marginTop: 4 },
  chipsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: COLORS.textMid },
  chipTextActive: { color: "#fff" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 110,
    backgroundColor: COLORS.borderLight,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  cardBody: { padding: 10 },
  category: {
    fontSize: 10,
    color: COLORS.textMid,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    minHeight: 34,
    lineHeight: 17,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: -1,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.brand,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    width: "100%",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textMid,
    marginTop: 4,
    textAlign: "center",
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pageBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  pageText: { fontSize: 13, fontWeight: "700", color: COLORS.textMid },
  pageTextActive: { fontSize: 13, fontWeight: "800", color: "#fff" },

  floatingPayButton: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  payLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  payBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  payBadgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  payText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  payRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payAmount: { color: "#fff", fontSize: 15, fontWeight: "800" },

  skeletonGrid: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
});