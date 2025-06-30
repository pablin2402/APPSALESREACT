import React, { useEffect, useState, useCallback, useContext } from "react";

import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Modal, Button, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";

import axios from "axios";
import { API_URL } from "../config";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from '@react-native-picker/picker';
import { AuthContext } from "../AuthContext";

export default function SalesManActivityScreen() {
    const [searchTerm, setSearchTerm] = useState("");

    const [salesData, setSalesData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [startDate, setStartDate] = useState(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    });
    const [endDate, setEndDate] = useState(new Date());
    const [detailsFilter, setDetailsFilter] = useState("");
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const { token, idOwner, idUser } = useContext(AuthContext);
    const [isPickerVisible, setIsPickerVisible] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const payload = {
                id_owner: idOwner,
                salesMan: idUser,
                details: detailsFilter,
            };

            if (startDate && endDate) {
                payload.startDate = startDate;
                payload.endDate = endDate;
            }
            const response = await axios.post(API_URL + "/whatsapp/salesman/activity/id", payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setSalesData(response.data || []);
            setFilteredData(response.data || []);
        } catch (error) {
        } finally {
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, []);
    const filterDataBySearchTerm = () => {
        const filtered = salesData.filter(item =>
            (item.clientName?.name + " " + item.clientName?.lastName).toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredData(filtered);
    };
    useEffect(() => {
        filterDataBySearchTerm();
    }, [searchTerm, salesData]);
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
    const formatDate2 = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };
    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours} horas ${minutes} minutos ${secs} segundos`;
        } else if (minutes > 0) {
            return `${minutes} minutos ${secs > 0 ? `con ${secs} segundos` : ''}`;
        } else {
            return `${secs} segundos`;
        }
    };
    const getDetailsStyle = (details) => {
        if (details.includes("Termina la visita")) {
            return { color: "#D3423E" };
        } else if (details.includes("Visita al cliente")) {
            return { color: "#27AE60" };
        } else if (details.includes("Pedido")) {
            return { color: "#1364E4" };
        }
        return { backgroundColor: "#E74C3C" };
    };
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
                                    <Text placeholderTextColor="#4A4A4A"
                                        style={{ color: "black" }}>{formatDate2(startDate - 1)}</Text>
                                </TouchableOpacity>
                            )}

                            {showStartDatePicker && (
                                <DateTimePicker
                                    value={startDate}
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
                                    value={endDate}
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
                                <TouchableOpacity style={styles.filterButton} onPress={() => fetchOrders()}>
                                    <FontAwesome name="filter" size={16} color="black" style={{ marginRight: 5 }} />
                                </TouchableOpacity>
                            )}
                        </View>


                        <TouchableOpacity style={styles.selectorButton} onPress={() => setModalVisible(true)}>
                            <Text style={styles.selectorButtonText}>{detailsFilter || "Seleccionar filtro de detalles"}</Text>
                        </TouchableOpacity>

                        <Modal visible={modalVisible} transparent={true} animationType="slide">
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
                                <View style={{ width: 300, backgroundColor: "white", padding: 20, borderRadius: 10 }}>
                                    <Picker
                                        selectedValue={detailsFilter}
                                        onValueChange={(itemValue) => {
                                            setDetailsFilter(itemValue);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Picker.Item label="Seleccionar filtro de detalles" value="" color="black" />
                                        <Picker.Item label="Pedido" value="Pedido" />
                                        <Picker.Item label="Visita al cliente" value="Visita al cliente" color="black" />
                                        <Picker.Item label="Termina la visita" value="Termina la visita" color="black" />

                                    </Picker>
                                    <TouchableOpacity
                                        onPress={() => setIsPickerVisible(false)}
                                        style={{
                                            backgroundColor: "#D63E3E",
                                            paddingVertical: 12,
                                            paddingHorizontal: 25,
                                            borderRadius: 25,
                                            alignItems: "center",
                                            marginTop: 10,
                                        }}
                                    >
                                        <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
                                            CANCELAR
                                        </Text>
                                    </TouchableOpacity>

                                </View>
                            </View>
                        </Modal>
                    </View>
                }
                data={filteredData}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                    return (
                        <TouchableOpacity style={styles.card}>
                            <View style={styles.cardContent}>
                                <View style={styles.row}>
                                    <Text style={styles.clientName}>
                                        {(item.clientName.name + " " + item.clientName.lastName).toUpperCase()}
                                    </Text>
                                    <Text style={styles.dateRight}>{formatDate(item.creationDate)}</Text>
                                </View>
                                <View
                                    style={{
                                        ...getDetailsStyle(item.details),
                                        borderRadius: 25,
                                        paddingVertical: 2,
                                        alignSelf: 'flex-start',
                                        marginTop: 2,
                                        marginVertical: 4,
                                        fontWeight: "bold",

                                    }}
                                >
                                    <Text style={{
                                        ...getDetailsStyle(item.details), fontWeight: "bold",
                                    }}>{item.details}</Text>
                                </View>
                                <View>
                                    {item.visitDurationSeconds > 0 && (
                                        <Text style={styles.visitDuration}>
                                            {"Tiempo: "}{formatDuration(item.visitDurationSeconds)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
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
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 40,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#ddd",
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
    },
    card: {
        backgroundColor: "white",
        borderRadius: 10,
        padding: 15,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: "#ddd",
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
        borderWidth: 1,
        borderColor: "#ddd",
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
        borderWidth: 1,
        borderColor: "#ddd",
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

