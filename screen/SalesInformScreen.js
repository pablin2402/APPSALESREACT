import React, { useEffect, useState, useContext } from "react";
import { useNavigation } from '@react-navigation/native';

import { View, Text, TextInput, FlatList, ActivityIndicator, Dimensions, TouchableOpacity, StyleSheet, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import axios from "axios";
import { API_URL } from "../config";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../AuthContext";
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Svg, { Path } from "react-native-svg";

export default function SalesInformScreen() {
  const navigation = useNavigation();
  const [salesData, setSalesData] = useState([]);
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
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { width } = Dimensions.get("window");

  const formatDate2 = (date) => {
    if (!date) return "Fecha";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  function utcToLocalDateString(utcDateStr, timeZone = 'America/La_Paz') {

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    return formatter.format(utcDateStr);
  }

  const fetchProducts = async () => {
    try {
      const payload = {
        id_owner: idOwner,
        salesId: idUser,
        page: page,
        limit: itemsPerPage
      };

      if (startDate && endDate) {
        const startDateLocal = utcToLocalDateString(startDate);
        const endDateLocal = utcToLocalDateString(endDate);
        payload.startDate = startDateLocal;
        payload.endDate = endDateLocal;
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
      setLoading(false);

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

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container1, styles.horizontal]}>
          <ActivityIndicator size="large" color="#D3423E" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.svgContainer}>
        <Svg height={200} width={width} style={styles.wave}>
          <Path
            d={`
              M0,0 
              L0,100 
              C${width * 0.55},190 ${width * 0.55},20 ${width},200 
              L${width},0 
              Z
            `}
            fill="#D3423E"
          />
        </Svg>
      </View>
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
                returnKeyType="search"
                onSubmitEditing={() => fetchProducts()}
              />
              <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                <Ionicons
                  name={showFilters ? "chevron-up" : "options"}
                  size={22}
                  color="#D3423E"
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            </View>

            {showFilters && (
              <>
                <View style={styles.dateFilterContainer}>
                  {!showStartDatePicker && !showEndDatePicker && (
                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateInput}>
                      <Text style={{ color: "black" }}>{formatDate2(startDate)}</Text>
                    </TouchableOpacity>
                  )}

                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate || new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, selectedDate) => {
                        setShowStartDatePicker(false);
                        if (selectedDate) setStartDate(selectedDate);
                      }}
                    />
                  )}

                  {!showStartDatePicker && !showEndDatePicker && (
                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateInput2}>
                      <Text style={{ color: "black" }}>{formatDate2(endDate)}</Text>
                    </TouchableOpacity>
                  )}

                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate || new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, selectedDate) => {
                        setShowEndDatePicker(false);
                        if (selectedDate) setEndDate(selectedDate);
                      }}
                    />
                  )}

                  <TouchableOpacity style={styles.filterButton} onPress={() => fetchProducts()}>
                    <FontAwesome name="filter" size={20} color="#D3423E" />
                  </TouchableOpacity>
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
              </>
            )}
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
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginVertical: 4 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor:
                      item.orderStatus === "aproved" ? "#D1FAE5" :
                        item.orderStatus === "En Ruta" ? "#DBEAFE" :
                          item.orderStatus === "cancelled" ? "#FECACA" :
                            item.orderStatus === "created" ? "#FEF9C3" :
                              "#E5E7EB",
                    borderRadius: 25,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    marginRight: 8,
                  }}>
                    {item.orderStatus === "aproved" && (
                      <>
                        <FontAwesome name="check-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={{ color: "#059669", fontWeight: "bold", fontSize: 12 }}>Aprobado</Text>
                      </>
                    )}

                    {item.orderStatus === "En Ruta" && (
                      <>
                        <FontAwesome name="truck" size={14} color="#3B82F6" style={{ marginRight: 4 }} />
                        <Text style={{ color: "#2563EB", fontWeight: "bold", fontSize: 12 }}>En Ruta</Text>
                      </>
                    )}

                    {item.orderStatus === "cancelled" && (
                      <>
                        <FontAwesome name="times-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                        <Text style={{ color: "#DC2626", fontWeight: "bold", fontSize: 12 }}>Cancelado</Text>
                      </>
                    )}

                    {item.orderStatus === "created" && (
                      <>
                        <FontAwesome name="exclamation-circle" size={14} color="#FBBF24" style={{ marginRight: 4 }} />
                        <Text style={{ color: "#CA8A04", fontWeight: "bold", fontSize: 12 }}>Creado</Text>
                      </>
                    )}

                    {!["aproved", "En Ruta", "cancelled", "created"].includes(item.orderStatus) && (
                      <>
                        <FontAwesome name="question-circle" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
                        <Text style={{ color: "#6B7280", fontWeight: "bold", fontSize: 12 }}>Desconocido</Text>
                      </>
                    )}
                  </View>

                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: item.payStatus === "Pagado" ? "#27AE60" : "#E74C3C",
                    borderRadius: 25,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                  }}>
                    <FontAwesome
                      name={item.payStatus === "Pagado" ? "money" : "credit-card-alt"}
                      size={14}
                      color="#FFF"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 12 }}>{item.payStatus}</Text>
                  </View>

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
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  svgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  container1: {
    flex: 1,
    justifyContent: 'center',
  },
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 45,
    marginBottom: 10,
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },

  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#2E2B2B",
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 20,
    marginRight: 5,
    alignItems: "center",
  },
  dateInput2: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 20,
    marginLeft: 5,
    alignItems: "center",
  },
  filterButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
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
  card: {
    backgroundColor: "#fff",
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 25,
    color: "#000",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 5,
    marginHorizontal: 2,
  },
  cardContent: {
    flexDirection: "column",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  clientName2: {
    fontSize: 14,
    color: "#4A4A4A",
  },
  rowText: {
    fontWeight: "bold",
    marginBottom: 4,
    color: "#4A4A4A",
  },
  location: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E2B2B",
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
});

