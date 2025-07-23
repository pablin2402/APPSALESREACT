import React, { useEffect, useCallback, useState, useContext } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TextInput, FlatList,Dimensions, ActivityIndicator, TouchableOpacity, Image, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../AuthContext";
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Svg, { Path } from "react-native-svg";

export default function ClientScreen() {
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
    const { token, idOwner, idUser } = useContext(AuthContext);
    const { width } = Dimensions.get("window");

    const fetchOrders = useCallback(async (pageNumber, searchTerm) => {
        setLoading(true);
        try {
            const client = {
                id_user: idOwner,
                salesId: idUser,
                page: pageNumber,
                limit: 10,
                search: searchTerm
            };
            const response = await axios.post(API_URL + "/whatsapp/client/sales", client, {
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
        navigation.navigate("ClientDetailsScreen", { client: client._id });
    };
    const insets = useSafeAreaInsets();
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
        <View style={[styles.container, { flex: 1, paddingTop: insets.top }]}>
             <View style={styles.svgContainer}>
                <Svg height={200} width={width} style={styles.wave}>
                <Path
                    d={`
                    M0,0 
                    L0,70 
                    C${width * 0.45},190 ${width * 0.35},20 ${width},170 
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
                        <View style={styles.searchRow}>
                            <View style={styles.searchBox}>
                                <Ionicons name="search" size={20} color="#D3423E" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Buscar por nombre, apellido..."
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                    placeholderTextColor="#000"
                                    returnKeyType="search"
                                    onSubmitEditing={() => fetchOrders(1, searchTerm)}
                                />
                            </View>
                        </View>
                    </View>

                }
                data={salesData}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => goToClientDetails(item)}>
                        <Image
                            style={styles.image}
                            source={{ uri: item.identificationImage || "https://us.123rf.com/450wm/tkacchuk/tkacchuk2004/tkacchuk200400017/143745488-no-hay-icono-de-imagen-vector-de-línea-editable-no-hay-imagen-no-hay-foto-disponible-o-no-hay.jpg" }}
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
    input: {
        flex: 1,
        fontSize: 14, 
        color: "#f5f5f5",
        backgroundColor: "#f5f5f5",
    },
    card: {
        flexDirection: "row",
        padding: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 12,
        alignItems: "center",
        marginHorizontal: 8, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
      },
    image: {
        width: 60,
        height: 60,
        borderRadius: 30,
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
        marginTop: 4,
    },
    icon: {
        marginRight: 5,
    },
    location: {
        fontSize: 14,
        color: "#4A4A4A",
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
        backgroundColor: "#f5f5f5",
        borderRadius: 20,
        paddingHorizontal: 10,
        height: 40,
        elevation: 3,
        flex: 1,
        marginRight: 10,
        marginHorizontal: 8,
    },
    searchIcon: {
        marginRight: 10,
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
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
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
        borderTopWidth: 1,
        borderColor: "#ddd",
        paddingBottom: 20, 
    },
});

