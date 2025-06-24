import React, { useEffect, useCallback, useContext,useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";

import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";

import { FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../AuthContext";

export default function ClientOrderDetailsScreen() {
    const route = useRoute();
    const cart1 = route.params?.carts || [];
    const [cart, setCart] = useState(cart1);

    const navigation = useNavigation();
    const [searchTerm, setSearchTerm] = useState("");
    const [salesData, setSalesData] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const limit = 6;
    const [page, setPage] = useState(1);
    const range = 2;
    const startPage = Math.max(1, page - range);
    const endPage = Math.min(totalPages, page + range);
    const pagesToShow = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    const { token,idOwner,idUser } = useContext(AuthContext);

    const fetchOrders = useCallback(async (pageNumber, searchTerm) => {
        setLoading(true);
        try {
            const client = {
                id_user: idOwner,
                salesId: idUser,
                page: pageNumber,
                limit: 8,
                search: searchTerm
            };
            const response = await axios.post(API_URL + "/whatsapp/client/sales", client,  {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
            setSalesData(response.data.data);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error("Error fetching orders:", error.response ? error.response.data : error.message);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchOrders(page, searchTerm);
    }, [page]);

    const goToClientDetails = (client) => {
        navigation.navigate("CartFinalDetailsScreen", { carts:cart,client: client });
    };
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.container, { flex: 1, paddingTop: insets.top }]}>
        <FlatList
            ListHeaderComponent={
                <View style={styles.searchContainer}>
                    <View style={styles.searchRow}>
                        <View style={styles.searchBox}>
                            <Ionicons name="search" size={20} color="#D3423E" style={styles.searchIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Buscar por Nombre, apellido, teléfono..."
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                                placeholderTextColor="#000"
                                themeVariant="light" 

                            />
                        </View>
                        <TouchableOpacity style={styles.searchButton} onPress={() => fetchOrders(1, searchTerm)}>
                            <Text style={styles.searchButtonText}>Buscar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            }
            data={salesData}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => goToClientDetails(item)}>
                    <Image
                        style={styles.image}
                        source={{ uri: item.profilePicture || "https://us.123rf.com/450wm/tkacchuk/tkacchuk2004/tkacchuk200400017/143745488-no-hay-icono-de-imagen-vector-de-línea-editable-no-hay-imagen-no-hay-foto-disponible-o-no-hay.jpg" }}
                    />
                    <View style={styles.cardContent}>
                        <Text style={styles.clientName}>{item.name} {item.lastName}</Text>
                        <View style={styles.locationContainer}>
                            <FontAwesome name="map-marker" size={16} color="#D3423E" style={styles.icon} />
                            <Text style={styles.location}>{item.client_location?.direction || "No disponible"}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            )}
        />

        {totalPages > 1 && (
            <View style={styles.fixedPagination}>
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
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9f9f9",
        paddingHorizontal: 20,
    },
    input: {
        flex: 1,
        fontSize: 14,
        width: "20%",
        padding: 5,
        color: "#000",

    },
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 10,
        marginBottom: 10,
        borderRadius: 10,
        elevation: 3,
        borderColor: "#ccc",
        color: "#000",
        borderColor: "#ddd",
        elevation: 3,
        borderWidth: 1,
        marginVertical: 5,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 15,
    },
    cardContent: {
        flex: 1,
        marginLeft: 10,
        justifyContent: "center",
    },
    clientName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#000",
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
        fontSize: 14,
        color: "#000",
    },
    searchContainer: {
        marginBottom: 15,
    },

    searchRow: {
        flexDirection: "row",
        alignItems: "center",
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
        flex: 1,
        marginRight: 10,

    },
    searchIcon: {
        marginRight: 10,
    },
    searchContainer: {
        marginBottom: 15,
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
        borderColor: "#2E2B2B",
    },
    activePage: {
        backgroundColor: "#D3423E",
    },
    activePageText: {
        color: "white",
        fontWeight: "bold",
    },
    searchButton: {
        backgroundColor: "#D3423E",
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        elevation: 3,
    },

    searchButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    fixedPagination: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
        backgroundColor: "#f9f9f9",
        borderTopWidth: 1,
        borderColor: "#ddd",
    },


});
