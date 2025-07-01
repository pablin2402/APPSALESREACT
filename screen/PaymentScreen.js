import React, { useEffect, useState, useContext } from "react";

import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,ActivityIndicator, Modal, Button, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import axios from "axios";
import { API_URL } from "../config";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../AuthContext";

export default function PaymentScreen() {
    const [searchTerm, setSearchTerm] = useState("");

    const [salesData, setSalesData] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const insets = useSafeAreaInsets();
    const range = 2;

    const startPage = Math.max(1, page - range);
    const endPage = Math.min(totalPages, page + range);
    const pagesToShow = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    const { token, idOwner, idUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);

    const fetchProducts = async (page) => {
        try {
            const payload = {
                id_owner: idOwner,
                sales_id: idUser,
                limit: 5,
                page: page,
                clientName: searchTerm
            };

            if (startDate && endDate) {
                payload.startDate = startDate;
                payload.endDate = endDate;
            }

            const response = await axios.post(API_URL + "/whatsapp/order/pay/sales/id", payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setSalesData(response.data.data || []);
            setTotalPages(response.data.pagination.totalPages);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchProducts(page);
    }, [page]);
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
    const formatDate2 = (date) => {
        if (!date) return "Fecha";
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, "0");
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
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
            <FlatList
                ListHeaderComponent={
                    <View style={styles.searchContainer}>
                        <View style={styles.searchBox}>
                            <Ionicons name="search" size={20} color="#D3423E" style={styles.searchIcon} />
                            <TextInput
                                placeholder="Buscar vendedor"
                                value={searchTerm}
                                onChangeText={(text) => {
                                    setSearchTerm(text);
                                }}
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
                    </View>
                }
                data={salesData}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                    return (
                        <TouchableOpacity style={styles.card}>
                            <View style={styles.cardContent}>
                                <Text style={styles.rowText}>{formatDate(item.creationDate)|| "No disponible"}</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.clientName2}>{item.orderId.id_client.name + " " + item.orderId.id_client.lastName}</Text>
                                    <Text style={styles.location}>Bs. {item.total.toFixed(2) || "No disponible"}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.clientName2}>{"# "+item.orderId.receiveNumber}</Text>

                                    <View
                                        style={{
                                            backgroundColor: item.paymentStatus === "paid" ? "#E74C3C" : "#27AE60",
                                            borderRadius: 20,
                                            paddingVertical: 2,
                                            paddingHorizontal: 8,
                                            alignSelf: 'flex-start',
                                            marginTop: 4,
                                            marginBottom:4,
                                            marginVertical: 4,
                                        }}
                                    >
                                        <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                                            {item.paymentStatus === 'paid' && 'PAGO INGRESADO'}
                                            {item.paymentStatus === 'confirmado' && 'PAGO APROBADO'}
                                        </Text>
                                    </View>
                                </View>

                            </View>
                        </TouchableOpacity>
                    );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            {totalPages > 1 && (
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
            )}
        </View>

    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#E7E6E6",
        paddingHorizontal: 20,
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

    activePage: {
        backgroundColor: "#D3423E",
    },
    activePageText: {
        color: "white",
        fontWeight: "bold",
    },
    searchContainer: {
        marginBottom: 15,
        
    },
    location: {
        fontSize: 18,
    },
    clientName: {
        fontSize: 18,
        fontWeight: "bold",
    },
    clientName2: {
        fontSize: 18,
        fontWeight: "normal",
    },
    rowText: {
        fontWeight: "bold",
        fontSize: 16
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingHorizontal: 10,
        height: 40,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#B0B0B0",
    },
    searchIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        width: "20%",
        padding: 5,
        color: "#333",
        borderRadius: 20,

    },
    card: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 15,
        marginVertical: 5,
        borderColor: "#AFABAB",
        borderWidth: 1,
        elevation: 3,
    },
    cardContent: {
        flexDirection: "column",
    },
    date: {
        fontSize: 14,
        color: "#666",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    clientName: {
        fontSize: 18,
        fontWeight: "bold",
    },
    details: {
        fontSize: 14,
        color: "#444",
        marginTop: 5,
    },
    separator: {
        height: 10,
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
    selectorButton: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
        marginVertical: 5
    },
    selectorButtonText: { color: "#333", textAlign: "left" },
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
    dateRight: {
        fontSize: 14,
        color: "#666",
        marginLeft: 'auto',
        textAlign: 'right',
    },
    visitDuration: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#2C3E50",
    },
});

