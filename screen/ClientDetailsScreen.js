import React, { useEffect, useState, useCallback,useContext } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Platform } from "react-native";

import axios from "axios";

import { API_URL } from "../config";
import { FontAwesome } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext";

export default function ClientDetailsScreen() {
  const route = useRoute();
  const clientId = route.params?.client;

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { token,idOwner } = useContext(AuthContext);
  const range = 3;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  
  const fetchClientData = useCallback(async () => {
    try {
      const response = await axios.post(API_URL+"/whatsapp/client/info/id", { _id: clientId }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setClient(response.data[0]);
    } catch (error) {
      console.error("Error al obtener los datos del cliente", error);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const fetchSalesData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(API_URL+"/whatsapp/order/id/user", {
        id_owner:idOwner,
        id_client: clientId,
        page: page,
        limit:5
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSalesData(response.data.orders || []);
      setFilteredData(response.data.orders || []);
      setTotalPages(parseInt(response.data.totalPages || 1));
    } catch (error) {
      console.error("Error al obtener las ventas", error);
    } finally {
      setLoading(false);
    }
  }, [clientId,page]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  if (!client) return <ActivityIndicator size="large" color="#D3423E" style={{ marginTop: 50 }} />;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const filterData = () => {
    let filtered = salesData;
    if (startDate && endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.creationDate);
        return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
      });
    }

    setFilteredData(filtered);
  }
  const handleRowClick = (item) => {
    navigation.navigate("OrderDetailsScreen", {
      products: item.products,
      files: item,
      orderId: item._id, 
    });
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.profileContainer}>
        <Image
          source={{ uri: client.identificationImage || "https://via.placeholder.com/150" }}
          style={styles.identificationImage}
        />
        <Text style={styles.clientName}>{client.name} {client.lastName}</Text>
        <View style={styles.infoRow}>
          <FontAwesome name="building" size={16} color="#D3423E" />
          <Text style={styles.infoText}>{client.company || "No disponible"}</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="map-marker" size={16} color="#D3423E" />
          <Text style={styles.infoText}>{client.client_location?.direction || "No disponible"}</Text>
        </View>
      </View>
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateInput}>
          <Text>{formatDate(startDate)}</Text>
        </TouchableOpacity>

        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            placeholderTextColor="#2E2B2B"
            themeVariant="light" 
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}

        <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateInput}>
          <Text>{formatDate(endDate)}</Text>
        </TouchableOpacity>

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            placeholderTextColor="#2E2B2B"
            themeVariant="light"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        <TouchableOpacity style={styles.filterButton} onPress={filterData}>
          <FontAwesome name="filter" size={16} color="#D3423E" style={{ marginRight: 5 }} />
          <Text style={styles.filterButtonText}>FILTRAR</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size={80} color="#D3423E" />
        </View>      
        ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleRowClick(item)}>
              <View style={styles.cardContent}>
                <Text style={styles.rowText}>{formatDate(item.creationDate)}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.clientName2}>{"#" + item.receiveNumber}</Text>
                <View
                    style={{
                      backgroundColor: item.payStatus === "Pagado" ? "#27AE60" : "#E74C3C",
                      borderRadius: 25,
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      alignSelf: 'flex-start',
                      marginTop: 2,
                      marginVertical: 4,
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "bold" }}>{item.payStatus}</Text>
                  </View>  
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={styles.locationContainer}></View>
                    <Text style={styles.location}>Bs. {item.totalAmount || "No disponible"}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => setPage(prev => Math.max(prev - 1, 1))} disabled={page === 1} style={[styles.pageButton, page === 1 && styles.disabledButton]}><Text>◀</Text></TouchableOpacity>
                {pagesToShow.map((num) => (
                  <TouchableOpacity key={num} onPress={() => setPage(num)} style={[styles.pageButton, page === num && styles.activePage]}>
                    <Text style={page === num ? styles.activePageText : styles.pageText}>{num}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setPage(prev => Math.min(prev + 1, totalPages))} disabled={page === totalPages} style={[styles.pageButton, page === totalPages && styles.disabledButton]}><Text>▶</Text></TouchableOpacity>
              </View>
            )
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 16,
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  infoText: {
    marginLeft: 5,
  },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 50
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    color: "#000",
    borderColor: "#ddd",
    elevation: 3,
    borderWidth: 1, 
    marginVertical: 5,
  },
  cardContent: {
    flexDirection: "column",
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateInput: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    marginRight: 5,
    borderColor: "#ddd",
    elevation: 3,
    borderWidth: 1, 
  },
  filterButton: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonText: {
    color: "#D3423E",
    fontSize: 18,
    fontWeight: "bold",
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
  pageText: {
    color: "#000",
  },
  disabledButton: {
    opacity: 0.5,
  },
  
});
