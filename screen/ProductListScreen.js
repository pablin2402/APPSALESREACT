import React, { useEffect, useContext, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
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

  const addToCart = (product) => {
    const existingIndex = cart.findIndex((item) => item._id === product._id);
    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        { ...product, quantity: 1, price: product.priceId?.price || 0 },
      ]);
    }
  };
  const removeFromCart = (productId) => {
    const existingIndex = cart.findIndex((i) => i._id === productId);
    if (existingIndex === -1) return;
    const updated = [...cart];
    if (updated[existingIndex].quantity > 1) {
      updated[existingIndex].quantity -= 1;
    } else {
      updated.splice(existingIndex, 1);
    }
    setCart(updated);
  };
  const getQty = (productId) =>
    cart.find((i) => i._id === productId)?.quantity || 0;
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
    const qty = getQty(item._id);
    return (
      <View style={[styles.card, { width: cardWidth }]}>
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

          {qty > 0 && (
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>{qty}</Text>
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

            {qty === 0 ? (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addToCart(item)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => removeFromCart(item._id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={qty === 1 ? "trash-outline" : "remove"}
                    size={14}
                    color={COLORS.brand}
                  />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => addToCart(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={14} color={COLORS.brand} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
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
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Productos</Text>
                  <Text style={styles.heroSubtitle}>
                    Crea tu pedido y agrega al carrito
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

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={COLORS.brand} />
            <Text style={styles.loadingText}>Cargando productos...</Text>
          </View>
        ) : (
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
        )}

        {cart.length > 0 && (
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

  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textMid,
    fontSize: 13,
    fontWeight: "500",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
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
  qtyBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  qtyBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

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
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.brand,
    minWidth: 14,
    textAlign: "center",
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
});