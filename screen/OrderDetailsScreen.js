import React, { useEffect, useState, useContext, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import axios from "axios";
import { API_URL } from "../config";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext";

export default function OrderDetailsScreen() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const clientId = route.params?.orderId;
  const productsList = route.params?.products;
  const filesList = route.params?.files;
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [totalDescuentos, setTotalDescuentos] = useState(0);

  const [setSalesData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);

  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);

  const [activeTab, setActiveTab] = useState("products");
  const { token, idOwner } = useContext(AuthContext);

  useEffect(() => {
    if (Array.isArray(productsList)) {
      let total = 0;
      let descuentos = 0;

      productsList.forEach((product) => {
        const precio = product.precio || 0;
        const cantidad = product.cantidad || 1;
        const descuento = product.descuento || 0;
        descuentos += descuento * cantidad;
        total += (precio - descuento) * cantidad;
      });

      setTotalGeneral(total);
      setTotalDescuentos(descuentos);
    }
  }, [productsList]);
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(API_URL + "/whatsapp/order/pay/list/id", {
        orderId: clientId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSalesData(response.data || []);
    } catch (error) {
      console.error("Error al cargar los productos:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  const fetchPayments = useCallback(async () => {
    try {
      const response = await axios.post(API_URL + "/whatsapp/order/pay/id", {
        id_client: filesList.id_client._id,
        id_owner: idOwner,
        orderId: filesList._id
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payments = response.data || [];
      const totalPaidSum = payments.reduce((sum, payment) => sum + (payment.total || 0), 0);
      const totalDebtInitial = payments.length > 0 ? payments[0].debt : 0;
      setPaymentsData(payments);
      setTotalPaid(totalPaidSum);
      setTotalDebt(totalDebtInitial);
    } catch (error) {
      console.error("Error al obtener los pagos", error);
    }
  }, [filesList]);
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);
  const formatAccountStatus = (status) => {
    switch (status) {
      case "pending":
        return "Contado";
      case "credito":
        return "Crédito";
      default:
        return status;
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculatedDebt = totalGeneral - totalPaid > 0 ? totalGeneral - totalPaid : 0;
  const handlePay = () => {
    navigation.navigate("AddPayment", { client: filesList.id_client._id, order: clientId, debt: calculatedDebt });
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ marginTop: 30 }}>
        <View style={styles.row}>
          <Text style={styles.title}>Cliente:</Text>
          <Text style={styles.highlight}>
            {filesList?.salesId?.fullName + " " + filesList?.salesId?.lastName}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.title}>Nota de remisión:</Text>
          <Text style={styles.highlight}>{filesList?.receiveNumber || "No disponible"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.subtitle}>Tipo de pago:</Text>
          <Text style={styles.highlight}>{formatAccountStatus(filesList?.accountStatus) || "No disponible"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.subtitle}>Vencimiento:</Text>
          <Text style={styles.highlight}>
            {filesList?.dueDate
              ? new Date(filesList.dueDate).toLocaleDateString("es-ES")
              : new Date(filesList?.creationDate).toLocaleDateString("es-ES")}
          </Text>
        </View>
      </View>


      <View style={[styles.tabContainer, { marginTop: 20 }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "products" && styles.activeTab]}
          onPress={() => setActiveTab("products")}
        >
          <Text style={[styles.tabText, activeTab === "products" && styles.activeTabText]}>PRODUCTOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "payments" && styles.activeTab]}
          onPress={() => setActiveTab("payments")}
        >
          <Text style={[styles.tabText, activeTab === "payments" && styles.activeTabText]}>PAGOS</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "products" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={productsList}
            keyExtractor={(item) => item.nombre}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.rowText}>{item.nombre || "No disponible"}</Text>
                  <View style={styles.rowItem}>
                    <Text style={styles.rowLabel}>Cantidad botella:</Text>
                    <Text style={styles.rowValue}>{item.cantidad || "No disponible"}</Text>
                  </View>
                  <View style={styles.rowItem}>
                    <Text style={styles.rowLabel}>Precio:</Text>
                    <Text style={styles.rowValue}>
                      {item.precio ? `${item.precio.toFixed(2)} Bs.` : "No disponible"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={{ marginTop: 15, marginBottom: 20 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Saldo por pagar:</Text>
              <Text style={styles.value}>
                Bs. {calculatedDebt?.toFixed(2) || "No disponible"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Pagado:</Text>
              <Text style={styles.value}>Bs. {totalPaid.toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total General:</Text>
              <Text style={styles.value}>Bs. {totalGeneral.toFixed(2)}</Text>
            </View>
          </View>

        </View>
      )}

      {activeTab === "payments" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={paymentsData}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.rowText}>{formatDate(item.creationDate)}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.clientName2}>{item.sales_id?.fullName + " " + item.sales_id?.lastName}</Text>
                    <Text style={styles.location}>Bs. {item.total?.toFixed(2) || "No disponible"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={styles.location}></View>
                    <View
                      style={{
                        backgroundColor:
                          item.paymentStatus === "paid"
                            ? "#3B82F6"
                            : item.paymentStatus === "confirmado"
                              ? "#16A34A"
                              : item.paymentStatus === "rechazado"
                                ? "#DC2626"
                                : "#9CA3AF",
                        paddingHorizontal: 14,
                        paddingVertical: 4,
                        borderRadius: 9999,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 14 }}>
                        {item.paymentStatus === "paid" && "INGRESADO"}
                        {item.paymentStatus === "confirmado" && "PAGO CONFIRMADO"}
                        {item.paymentStatus === "rechazado" && "PAGO RECHAZADO"}
                        {!["paid", "confirmado", "rechazado"].includes(item.paymentStatus) && "ESTADO DESCONOCIDO"}
                      </Text>
                    </View>

                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={{ marginTop: 15, marginBottom: 20 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Saldo por pagar:</Text>
              <Text style={styles.value}>Bs. {calculatedDebt.toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Pagado:</Text>
              <Text style={styles.value}>Bs. {totalPaid.toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total General:</Text>
              <Text style={styles.value}>Bs. {totalGeneral.toFixed(2)}</Text>
            </View>

            {totalGeneral > totalPaid && (
              <TouchableOpacity
                onPress={handlePay}
                style={{
                  marginTop: 20,
                  backgroundColor: "#D3423E",
                  paddingVertical: 15,
                  borderRadius: 25,
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 20 }}>PAGAR</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7E6E6",
    padding: 16,
  },
  rowText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  clientName2: {
    fontSize: 18,
    fontWeight: "normal",
  },
  location: {
    fontSize: 18,
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#B0B0B0",
  },
  cardContent: {
    flexDirection: "column",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    padding: 15,
    backgroundColor: "white",
    alignItems: "center",
    borderRadius: 15,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: "#B0B0B0",
  },
  activeTab: {
    backgroundColor: "#D3423E",
  },
  tabText: {
    color: "black",
    fontWeight: "bold",
  },
  activeTabText: {
    color: "white",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "left",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "left",
  },
  highlight: {
    fontSize: 20,
    color: "#1F2937",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  label: {
    fontSize: 16,
    color: "#4A4A4A",
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  rowLabel: {
    fontSize: 16,
    color: "#333",
  },
  rowValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
});