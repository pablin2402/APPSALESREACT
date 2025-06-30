import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Image } from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CartDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const cart1 = route.params?.carts || [];
  const [cart, setCart] = useState(cart1);
  const insets = useSafeAreaInsets();

  const handleQuantityChange = (index, delta) => {
    const newCart = [...cart];
    const newQuantity = newCart[index].quantity + delta;
    if (newQuantity > 0) {
      newCart[index].quantity = newQuantity;
      setCart(newCart);
    }
  };

  const handleRemoveItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return parseFloat(cart.reduce(
      (sum, item) => sum + item.quantity * (item.price - (item.discount || 0)),
      0
    ).toFixed(2));
  };

  const calcularDescuentos = () => {
    return parseFloat(cart.reduce(
      (sum, item) => sum + item.quantity * (item.discount || 0),
      0
    ).toFixed(2));
  };
  const handleQuantityInput = (index, text) => {
    const newCart = [...cart];
    const number = parseInt(text, 10);
    newCart[index].quantity = isNaN(number) || number < 0 ? 0 : number;
    setCart(newCart);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Tu carrito</Text>
      <ScrollView style={styles.cartList}>
        {cart.map((item, index) => (
          <View key={index} style={styles.card}>
            <Image
              source={{ uri: item.productImage || "https://via.placeholder.com/50" }}
              style={styles.productImage}
            />

            <View style={styles.detailsContainer}>
              <View style={styles.topRow}>
                <Text style={styles.name}>{item.productName}</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                  <Ionicons name="trash" size={20} color="#D3423E" />
                </TouchableOpacity>
              </View>

              <Text style={styles.price}>Precio: Bs {item.price.toFixed(2)}</Text>

              <View style={styles.bottomRow}>
                <TextInput
                  value={String(item.quantity)}
                  onChangeText={(text) => handleQuantityInput(index, text)}
                  keyboardType="numeric"
                  style={styles.quantityInput}
                  placeholder="0"
                />
                <Text style={styles.totalText}>
                  Total: Bs {(item.quantity * (item.price - (item.discount || 0))).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ))}

      </ScrollView>

      <View style={styles.summary}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.discountText}>Descuentos:</Text>
          <Text style={styles.discountText}>Bs {calcularDescuentos()}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={styles.totalText}>Subtotal:</Text>
          <Text style={styles.totalText}>Bs {calcularTotal()}</Text>
        </View>

        <TouchableOpacity
          style={styles.payButton}
          onPress={() => navigation.navigate("ClientOrderDetailsScreen", { carts: cart })}
        >
          <Text style={styles.payButtonText}>Ir a pagar</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7E6E6",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
    textAlign: "center",
  },
  cartList: {
    flex: 1,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },

  productImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: "space-between",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  name: {
    fontSize: 16,
    fontWeight: "bold",
    flexShrink: 1,
    color: "#333",
  },
  price: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  quantityInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 60,
    textAlign: "center",
    fontSize: 16,
    color: "#000",
  },
  discount: {
    marginTop: 4,
    fontSize: 12,
    color: "#FFD700",
    fontWeight: "bold",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },


  quantityBtn: {
    padding: 6,
    borderRadius: 5,
    backgroundColor: "#eee",
  },
  quantityText: {
    marginHorizontal: 8,
    fontWeight: "bold",
    fontSize: 16,
    minWidth: 20,
    textAlign: "center",
  },
  totalSection: {
    alignItems: "flex-end",
  },
  total: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  summary: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  discountText: {
    fontSize: 15,
    color: "#888",
    textAlign: "right",
    marginBottom: 4,
  },
  totalText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
    marginBottom: 10,
  },
  payButton: {
    backgroundColor: "#D3423E",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  payButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    borderRadius: 25,

  },
});
