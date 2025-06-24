import React, { useEffect, useContext, useState } from "react";
import { useNavigation } from "@react-navigation/native";

import { View, Text, TextInput, FlatList, Image, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import axios from "axios";
import { API_URL } from "../config";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../AuthContext";

export default function ProductListScreen() {
  const navigation = useNavigation();
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory] = useState("");

  const [cart, setCart] = useState([]);

  const range = 3;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  const insets = useSafeAreaInsets();

  const { token, idOwner } = useContext(AuthContext);

  const goToCartDetails = () => {
    navigation.navigate("CartDetailsScreen", { carts: cart });
  };
  const addToCart = (product) => {
    const existingProductIndex = cart.findIndex((item) => item._id === product._id);

    if (existingProductIndex !== -1) {
      const updatedCart = [...cart];
      updatedCart[existingProductIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...product, quantity: 1, price: product.priceId?.price || 0 }]);
    }
  };
  const fetchProducts = async (pageNumber, search) => {
    setLoading(true);
    try {
      const response = await axios.post(API_URL + "/whatsapp/product/id", {
        id_user: idOwner,
        status: false,
        page: pageNumber,
        limit: 8,
        search: search,
        category: selectedCategory
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSalesData(response.data.products || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page, searchTerm);
  }, [page, selectedCategory]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#D3423E" style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar producto por nombre, categoría"
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={[styles.input, { color: '#000000' }]}
          placeholderTextColor="#4A4A4A"
          onSubmitEditing={() => fetchProducts(1, searchTerm)}
        />
        <TouchableOpacity style={styles.continueButton} onPress={() => fetchProducts(1, searchTerm)}>
          <Text style={styles.continueText}>FILTRAR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 10 }}
        data={salesData}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.productImage }} style={styles.image} />
            <Text style={styles.productName}>{item.productName || "Sin nombre"}</Text>
            <Text style={styles.category}>{item.categoryId?.categoryName || "Sin categoría"}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{item.priceId?.price ? `Bs. ${item.priceId.price}` : "N/A"}</Text>
              <TouchableOpacity onPress={() => addToCart(item)} style={styles.floatingButton1}>
                <Ionicons name="add" size={20} color="#000000" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                onPress={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                style={[styles.pageButton, page === 1 && styles.disabledButton]}
              >
                <Text>◀</Text>
              </TouchableOpacity>
              {pagesToShow.map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setPage(num)}
                  style={[styles.pageButton, page === num && styles.activePage]}
                >
                  <Text style={page === num ? styles.activePageText : styles.pageText}>{num}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                style={[styles.pageButton, page === totalPages && styles.disabledButton]}
              >
                <Text>▶</Text>
              </TouchableOpacity>
            </View>
          )
        }
        keyboardShouldPersistTaps="handled"
      />
    {cart.length > 0 && (
      <TouchableOpacity
        onPress={goToCartDetails}
        style={styles.floatingPayButton}
      >
        <Text style={styles.floatingPayButtonText}>Ver mi carrito</Text>
      </TouchableOpacity>
    )}

    </View>
  );

};
const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#D3423E",
    borderRadius: 30,
    width: 55,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingButton1: {
    fontSize: 16,
    backgroundColor: "#D3D3D3",
    borderRadius: 50,
    width: 35,
    height: 35,
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingPayButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#D3423E",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingPayButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 1,
    marginHorizontal: 10,

    width: "100%",
    justifyContent: "space-between",
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,

  },
  continueButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginLeft: 10,
  },
  continueText: {
    color: "#D3423E",
    fontWeight: "bold",
    fontSize: 16,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginVertical: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    minHeight: 180,
    justifyContent: "space-between"
  },
  image: {
    width: 70,
    height: 70,
    resizeMode: "cover",
    borderRadius: 10,
    marginBottom: 5
  },

  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
  },
  category: {
    fontSize: 12,
    color: "gray",
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    justifyContent: "space-between",
    width: "100%",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  pageButton: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginHorizontal: 5,
    borderColor: "#D3423E",
  },
  activePage: {
    backgroundColor: "#D3423E",
  },
  activePageText: {
    color: "white",
    fontWeight: "bold",
  },
});



