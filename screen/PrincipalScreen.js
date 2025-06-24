import React, { useEffect, useCallback, useState, useContext } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView from "react-native-maps";
import { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { GOOGLE_API_KEY } from "../config";
import { ScrollView } from "react-native";
import { AuthContext } from "../AuthContext";

export default function PrincipalScreen() {
  const navigation = useNavigation();
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [route, setRoute] = useState(null);
  const today = new Date();
  const [profile, setProfile] = useState(null);
  const [objectiveData, setObjectiveData] = useState([]);

  const { token, idOwner, idUser } = useContext(AuthContext);
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.post(API_URL + "/whatsapp/sales/id", {
          id_owner: idOwner,
          _id: idUser,
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setProfile(response.data);
      } catch (error) {
        console.error("Error al obtener los datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  function getStartOfDayInUTCMinus4(date) {
    const utcDate = new Date(date);
    utcDate.setHours(utcDate.getHours() - 4);
    return utcDate.toISOString();
  }
  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.post(API_URL + "/whatsapp/order/status", {
        salesId: idUser,
        orderStatus: "",
        id_owner: idOwner,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSalesData(response.data);
      setFilteredData(response.data);
    } catch (error) {
    }
  }, []);
  const startRoute = async () => {
    try {

      const response = await axios.post(API_URL + "/whatsapp/salesman/route/id", {
        salesMan: idUser,
        status: "Por iniciar",
        id_owner: idOwner,
        startDate: getStartOfDayInUTCMinus4(today),
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setRoute(response.data);
    } catch (error) {
    }
  };
  const fetchObjectiveDataRegion = async () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  
    try {
      const response = await axios.post(API_URL + "/whatsapp/sales/objective/list", {
        region: "TOTAL CBB",
        startDate,
        endDate,
        salesManId: idUser
      });
      const data = response.data;
      setObjectiveData(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOrders();
    fetchObjectiveDataRegion();
    startRoute();
  }, [fetchOrders]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(salesData);
    } else {
      const filtered = salesData.filter((item) =>
        item.id_client.name.toLowerCase().includes(searchTerm.toLowerCase())
        || item.id_client.lastName.toLowerCase().includes(searchTerm.toLowerCase())

      );
      setFilteredData(filtered);
    }
  }, [searchTerm, salesData]);
  const goToClientDetails = (client) => {
    navigation.navigate("OrderDetailsScreen", {
      orderId: client._id,
      products: client.products,
      files: client,
    });
  };

  const navigate = () => {
    navigation.navigate("Map", { screen: "MapScreen" });
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const formatDate2 = (dateString) => {
    const date = new Date(dateString);
    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayOfWeek = daysOfWeek[date.getDay()];
    const day = date.getDate().toString().padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayOfWeek}, ${day} de ${month} del ${year}`;
  };
  const totalPedidos = filteredData.length;
  const getRandomColor = () => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#F7B801", "#A29BFE",
      "#FF8C94", "#6A0572", "#00B8A9", "#F6416C"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Hola {profile?.fullName + " " + profile?.lastName || "Nombre no disponible"}</Text>
          {route && route.length > 0 ? (
            <View style={styles.headerRow}>
              <Text style={styles.dateText}>Ruta de Hoy {formatDate2(today)}</Text>
              <TouchableOpacity style={styles.openButton} onPress={navigate}>
                <Text style={styles.openButtonText}>Abrir &gt;</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.dateText}>No hay rutas disponibles</Text>
          )}
        </View>

        <MapView
          style={styles.map}
          initialRegion={{
            latitude: -17.38156252481452,
            longitude: -66.1613705009222,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
          showsUserLocation={true}
        >
          {route?.length > 0 &&
            route[0].route?.map((point, index) => (
              <Marker
                key={index}
                coordinate={{
                  latitude: parseFloat(point.client_location.latitud),
                  longitude: parseFloat(point.client_location.longitud),
                }}
                title={`${point.name}`}
              >
                <Image
                  source={require("../icons/tienda.png")}
                  style={{ width: 40, height: 40 }}
                />
              </Marker>
            ))}

          {route?.length > 0 && route[0].route?.length > 1 && (
            <MapViewDirections
              origin={{
                latitude: parseFloat(route[0].route[0].client_location.latitud),
                longitude: parseFloat(route[0].route[0].client_location.longitud),
              }}
              destination={{
                latitude: parseFloat(route[0].route[route[0].route.length - 1].client_location.latitud),
                longitude: parseFloat(route[0].route[route[0].route.length - 1].client_location.longitud),
              }}
              waypoints={route[0].route.slice(1, -1).map(point => ({
                latitude: parseFloat(point.client_location.latitud),
                longitude: parseFloat(point.client_location.longitud),
              }))}
              apikey={GOOGLE_API_KEY}
              strokeColor="black"
              strokeWidth={3}
            />
          )}
        </MapView>

        <View style={styles.header}>
          <Text style={styles.headerText}>
            Pedidos a entregar   #{totalPedidos}
          </Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Buscar por Nombre, apellido..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#000"
        />
        {filteredData.map((item, index) => (
          <TouchableOpacity key={index} style={styles.card} onPress={() => goToClientDetails(item)}>
            <View style={styles.cardContent}>
              <Text style={styles.rowText}>{formatDate(item.creationDate)}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.clientName}>
                  {(item.id_client.name + " " + item.id_client.lastName).toUpperCase()}
                </Text>
                <Text style={styles.location}>Bs. {item.totalAmount || "No disponible"}</Text>
              </View>
              <Text style={styles.clientName2}>{item.id_client.company}</Text>
              <Text style={styles.clientName2}>{"#" + item.receiveNumber}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                <View
                style={{
                  backgroundColor: item.payStatus === "Pagado" ? "#27AE60" : "#E74C3C",
                  borderRadius: 20,
                  paddingVertical: 2,
                  paddingHorizontal: 8,
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 8 }}>
                  {item.payStatus === "Pagado" ? "PAGO COMPLETO" : "PAGO PENDIENTE"}
                </Text>
              </View>
                </View>

                <View
                  style={{
                    backgroundColor:
                      item.orderStatus === "deliver"
                        ? "#F39C12"
                        : item.orderStatus === "En Ruta"
                          ? "#3498DB"
                          : item.orderStatus === "Entregado"
                            ? "#27AE60"
                            : "#E74C3C",
                    borderRadius: 20,
                    paddingVertical: 2,
                    paddingHorizontal: 8,
                  }}
                >
                <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 8 }}>
                {item.orderStatus === "deliver"
                      ? "PEDIDO CREADO"
                      : item.orderStatus === "En Ruta"
                        ? "PEDIDO EN CAMINO"
                        : item.orderStatus === "Entregado"
                          ? "PEDIDO ENTREGADO"
                          : item.orderStatus}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <View style={styles.header}>
          <Text style={styles.headerText}>
            Objetivos del mes
          </Text>
        </View>
        <View style={styles.card1}>
          {objectiveData.map((item, index) => {
            const progress = (item.caja / item.numberOfBoxes) * 100;
            const color = getRandomColor();

            return (
              <View key={index} style={styles.itemContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{item.lyne+" - Objectivo: "+item.numberOfBoxes.toFixed(2)}</Text>
                  <Text style={styles.percent}>{progress.toFixed(1)}%</Text>
                </View>
                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 25,
    elevation: 3,
    borderColor: "#ccc",
    color: "#000",
    borderColor: "#ddd",
    elevation: 3,
    borderWidth: 1,
    marginVertical: 5,
  },
  card1: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 16,
    marginVertical: 5,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cardContent: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
  },
  clientName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  icon: {
    marginRight: 5,
  },
  location: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  map: {
    width: "100%",
    height: "20%",
    borderRadius: 25,
    marginBottom: 10,
  },
  header: {
    backgroundColor: "#D63E3E",
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    alignItems: "left",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  dateText: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  openButton: {
    backgroundColor: "#D63E3E",
    padding: 10,
    borderRadius: 8,
  },
  openButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  map: {
    width: "100%",
    height: 250,
    borderRadius: 10,
    marginBottom: 10,
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    marginBottom: 10,
    color: "#000",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  itemContainer: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#444",
  },
  percent: {
    fontSize: 14,
    fontWeight: "500",
    color: "#444",
  },
  progressBackground: {
    height: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBar: {
    height: 40,
    borderRadius: 5,
  },
});
