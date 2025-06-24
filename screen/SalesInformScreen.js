import React, { useEffect, useState, useContext } from "react";
import { useNavigation } from '@react-navigation/native';

import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "react-native-vector-icons/Ionicons";

import axios from "axios";
import { API_URL } from "../config";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../AuthContext";

export default function SalesInformScreen() {
    const navigation = useNavigation();
    const [salesData, setSalesData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const { token,idOwner,idUser } = useContext(AuthContext);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
  
    const range = 2;
    const startPage = Math.max(1, page - range);
    const endPage = Math.min(totalPages, page + range);
    const pagesToShow = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    const fetchProducts = async () => {
        try {
            const response = await axios.post(API_URL + "/whatsapp/order/id/sales", {
                id_owner: idOwner,
                salesId: idUser,
                month: 6,
                year: 2025,
                page: page,
                limit: 5,
            },  {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            setSalesData(response.data.orders || []);
            setFilteredData(response.data.orders || []);
            setTotalPages(response.data.totalPages || 1);

        } catch (error) {
        } finally {
        }
    };
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredData(salesData);
        } else {
            const filtered = salesData.filter((item) =>
                item.id_client.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredData(filtered);
        }
    }, [searchTerm, salesData]);
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
      navigation.navigate("OrderDetailsScreen", { orderId: client._id, products: client.products,files: client });
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
          </View>
        }
        data={filteredData}
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
    backgroundColor: "white",
    paddingHorizontal: 20,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
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
    borderRadius: 10,
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
    borderColor: "#D3423E",
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
    color: "#D3423E",
  },
});

