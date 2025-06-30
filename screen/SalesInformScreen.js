import React, { useEffect, useState, useContext } from "react";
import { useNavigation } from '@react-navigation/native';

import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import axios from "axios";
import { API_URL } from "../config";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../AuthContext";

export default function SalesInformScreen() {
  const navigation = useNavigation();
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const { token, idOwner, idUser } = useContext(AuthContext);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState("");
  const range = 2;
  const startPage = Math.max(1, page - range);
  const endPage = Math.min(totalPages, page + range);
  const pagesToShow = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  const [itemsPerPage] = useState(10);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const formatDate2 = (date) => {
    if (!date) return "Fecha";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const fetchProducts = async () => {
    try {
      const payload = {
        id_owner: idOwner,
        salesId: idUser,
        page: page,
        limit: itemsPerPage
      };
      if (startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }
      if (searchTerm) {
        payload.fullName = searchTerm;
      }
      if (selectedStatus) {
        payload.payStatus = selectedStatus;
      }
      const response = await axios.post(API_URL + "/whatsapp/order/sales/id", payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSalesData(response.data.orders || []);
      setTotalPages(response.data.totalPages || 1);

    } catch (error) {
    } finally {
    }
  };
  useEffect(() => {
    fetchProducts();
  }, [page]);
  const insets = useSafeAreaInsets();
  const formatDate = (dateString) => {
    const date = new Date(dateString);

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };
  const goToClientDetails = (client) => {
    navigation.navigate("OrderDetailsScreen", { orderId: client._id, products: client.products, files: client });
  };
 
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#D3423E" style={styles.searchIcon} />
              <TextInput
                placeholder="Buscar por cliente"
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.input}
                placeholderTextColor="#4A4A4A"
              />
            </View>
            <View style={styles.dateFilterContainer}>
              {(!showStartDatePicker && !showEndDatePicker) && (
                <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateInput}>
                  <Text
                    placeholderTextColor="#4A4A4A"
                    style={{ color: "black" }}
                  >
                    {formatDate2(startDate)}
                  </Text>
                </TouchableOpacity>
              )}

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  placeholderTextColor="#4A4A4A"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  themeVariant="light"
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(false);
                    if (selectedDate) setStartDate(selectedDate);
                  }}
                />
              )}

              {(!showStartDatePicker && !showEndDatePicker) && (
                <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateInput2}>
                  <Text placeholderTextColor="#4A4A4A" style={{ color: "black" }}>{formatDate2(endDate)}</Text>
                </TouchableOpacity>
              )}

              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  placeholderTextColor="#4A4A4A"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  themeVariant="light"
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(false);
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )}

              {(!showStartDatePicker && !showEndDatePicker) && (
                <TouchableOpacity style={styles.filterButton} onPress={() => fetchProducts()}>
                  <FontAwesome name="filter" size={20} color="#D3423E" style={{ marginRight: 5 }} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.radioGroup}>
              {["Todos", "Pagado", "Pendiente"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.radioOption}
                  onPress={() => setSelectedStatus(status)}
                >
                  <View style={[styles.radioCircle, selectedStatus === status && styles.radioSelected]} />
                  <Text style={styles.radioLabel}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </View>
        }
        data={salesData}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => goToClientDetails(item)}>
            <View style={styles.cardContent}>
              <Text style={styles.rowText}>{formatDate(item.creationDate)}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.clientName}>
                  {(item.id_client.name + " " + item.id_client.lastName).toUpperCase()}
                </Text>
                <Text style={styles.location}>Bs. {item.totalAmount || "No disponible"}</Text>
              </View>
              <Text style={styles.clientName2}>{"#" + item.receiveNumber}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View />
                <View style={{
                  backgroundColor: item.payStatus === "Pagado" ? "#27AE60" : "#E74C3C",
                  borderRadius: 25,
                  paddingVertical: 2,
                  paddingHorizontal: 8,
                  alignSelf: 'flex-start',
                  marginTop: 2,
                  marginVertical: 4,
                }}>
                  <Text style={{ color: "#FFF", fontWeight: "bold" }}>{item.payStatus}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
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
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>


  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7E6E6",
    paddingHorizontal: 20,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#AFABAB",
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 15,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: "#B0B0B0",
  },
  cardContent: {
    flexDirection: "column",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  clientName2: {
    fontSize: 14,
  },
  rowText: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    fontWeight: "bold",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  pageButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#B0B0B0",
    marginHorizontal: 5,
    borderRadius: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  activePage: {
    backgroundColor: "#D3423E",
  },
  activePageText: {
    color: "white",
    fontWeight: "bold",
  },
  pageText: {
    color: "#2E2B2B",
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    height: 16,
    width: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8E8A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  radioSelected: {
    backgroundColor: '#D3423E',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    marginTop: 5,
  },
  dateInput: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    marginRight: 5,
    borderColor: "#AFABAB",
    borderWidth: 1,
    color: "black",
    backgroundColor: "#fff",
  },
  dateInput2: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    color: "black",
    borderRadius: 10,
    marginVertical: 5,
    borderColor: "#AFABAB",
    borderWidth: 1,
    backgroundColor: "#fff",
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
    fontWeight: "bold",
  },
});

