import React, { useEffect, useCallback, useState, useContext } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from "react-native";
import MapView from "react-native-maps";
import { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { GOOGLE_API_KEY } from "../config";
import { ScrollView } from "react-native";
import { AuthContext } from "../AuthContext";

export default function DeliveryPage() {
  const navigation = useNavigation();
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [route, setRoute] = useState(null);
  const today = new Date();
  const [profile, setProfile] = useState(null);
  const [id, setId] = useState([]);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const { token, idOwner, idUser } = useContext(AuthContext);
  
  const fetchProfile = async () => {
    try {
      const response = await axios.post(API_URL + "/whatsapp/delivery/id", {
        id_owner: idOwner,
        id: idUser,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setId(response.data._id);
        setProfile(response.data);
        await startRoute(); 
      }
    } catch (error) {
      console.error("Error al obtener los datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const startRoute = async () => {
    setIsRouteLoading(true);
    try {
      const response = await axios.post(API_URL + "/whatsapp/delivery/list/order/id", {
        delivery: idUser,
        id_owner: idOwner,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setFilteredData(response.data);
        setRoute(response.data);
        setRouteLoaded(true);
      }
    } catch (error) {
      console.error("Error al iniciar la ruta:", error);
    } finally {
      setIsRouteLoading(false);
    }
  };
  useEffect(() => {
    fetchProfile();
  }, []);

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
    navigation.navigate("OrderDetailsScreenDeliver", {
      orderId: client._id,
      products: client.products,
      files: client,
    });
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

  return (
    <View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Hola {profile?.fullName + " " + profile?.lastName || "Nombre no disponible"}</Text>
          {route && route.length > 0 ? (
            <View style={styles.headerRow}>
              <Text style={styles.dateText}>Ruta de Hoy {formatDate2(today)}</Text>
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
          {route?.[0]?.route?.map((point, index) => (
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

          {route?.[0]?.route?.length > 1 && (
            <MapViewDirections
              origin={{
                latitude: parseFloat(route[0].route[0].client_location.latitud),
                longitude: parseFloat(route[0].route[0].client_location.longitud),
              }}
              destination={{
                latitude: parseFloat(
                  route[0].route[route[0].route.length - 1].client_location.latitud
                ),
                longitude: parseFloat(
                  route[0].route[route[0].route.length - 1].client_location.longitud
                ),
              }}
              waypoints={route[0].route.slice(1, -1).map((point) => ({
                latitude: parseFloat(point.client_location.latitud),
                longitude: parseFloat(point.client_location.longitud),
              }))}
              apikey={GOOGLE_API_KEY}
              strokeColor="black"
              strokeWidth={3}
            />
          )}
        </MapView>

        <TextInput
          style={styles.input}
          placeholder="Buscar por Nombre, apellido..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#000"
        />
        {isRouteLoading ? (
          <Text style={{ textAlign: "center", marginTop: 10 }}>Cargando órdenes...</Text>
        ) : routeLoaded && route.length > 0 ? (
          route.map((ruta, i) =>
            ruta.route.map((item, index) => (
              <TouchableOpacity key={`${i}-${index}`} style={styles.card} onPress={() => goToClientDetails(item)}>
                <View style={styles.cardContent}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.clientName}>
                      {(item.name + " " + item.lastName).toUpperCase()}
                    </Text>
                    <Text style={styles.location}>Bs. {item.totalAmount || "No disponible"}</Text>
                  </View>
                  <Text style={styles.clientName2}>{item.client_location?.sucursalName}</Text>
                  <Text style={styles.clientName2}>{"#" + item.receiveNumber}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: item.payStatus === "Pagado" ? "#27AE60" : "#E74C3C", borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 }}>
                      <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 8 }}>
                        {item.payStatus === "Pagado" ? "PAGO COMPLETO" : "PAGO PENDIENTE"}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor:
                        item.orderStatus === "deliver" ? "#F39C12" :
                          item.orderStatus === "En Ruta" ? "#3498DB" :
                            item.orderStatus === "Entregado" ? "#27AE60" :
                              "#E74C3C",
                      borderRadius: 20,
                      paddingVertical: 2,
                      paddingHorizontal: 8
                    }}>
                      <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 8 }}>
                        {item.orderStatus === "deliver" ? "PEDIDO CREADO" :
                          item.orderStatus === "En Ruta" ? "PEDIDO EN CAMINO" :
                            item.orderStatus === "Entregado" ? "PEDIDO ENTREGADO" :
                              item.orderStatus}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          <Text style={{ textAlign: "center", marginTop: 10 }}>No se encontraron rutas disponibles.</Text>
        )}


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
    backgroundColor: "#FCFCFC",
    borderColor: "#AFABAB",
    borderWidth: 1,
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
