import React, { useEffect, useState, useRef, useContext } from "react";
import { View, StyleSheet, Dimensions, Text, Image, TouchableOpacity, Platform, TextInput, Button } from "react-native";
import MapView from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width, height } = Dimensions.get("window");
import { Marker } from "react-native-maps";
import { GOOGLE_API_KEY } from "../config";

import axios from "axios";
import { API_URL } from "../config";

import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext";

const MapScreenRoute = () => {

    const [clients, setClients] = useState([]);
    const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });
    const mapRef = useRef(null);
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [filteredData, setFilteredData] = useState([]);

    const [selectedClient, setSelectedClient] = useState(null);
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [detailsFilter] = useState("");
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const { token,idOwner,idUser } = useContext(AuthContext);

    useEffect(() => {
        getUserLocation()
    }, [])
    const fetchClients = async () => {
        try {
            const response = await axios.post(API_URL + "/whatsapp/salesman/id", {
                id_owner: idOwner,
                salesMan: idUser,
                startDate: startDate,
                endDate: endDate,
                details: detailsFilter,
            },{
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
            setClients(response.data || []);
            setFilteredData(response.data || []);
        } catch (error) {
        } finally {
        }
    };
    const filterDataBySearchTerm = () => {
        const filtered = clients.filter(item =>
            (item.clientName?.name + " " + item.clientName?.lastName).toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredData(filtered);
    };
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            await fetchClients();
        };
        if (isMounted) fetchData();
        return () => { isMounted = false; };
    }, []);
    useEffect(() => {
        filterDataBySearchTerm();
    }, [searchTerm, clients]);
    async function getUserLocation() {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            alert("Permisos denegados");
            return;
        }
        let location = await Location.getCurrentPositionAsync({});
        const current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
        setOrigin(prevOrigin => {
            if (prevOrigin.latitude !== current.latitude || prevOrigin.longitude !== current.longitude) {
                return current;
            }
            return prevOrigin;
        });
        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
    };
    useEffect(() => {
        let interval = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer(prevTime => prevTime + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timer]);
    const formatDate2 = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: -17.38156252481452,
                    longitude: -66.1613705009222,
                    latitudeDelta: 0.09,
                    longitudeDelta: 0.04
                }}
                showsUserLocation={true}
            >
                {filteredData.map((client, index) => (
                    <Marker
                        key={index}
                        coordinate={{
                        latitude: client.latitude,
                        longitude: client.longitude,
                        }}
                        title={`${client.clientName.name} ${client.clientName.lastName}`}
                    >
                        <Image
                                source={require("../icons/tienda.png")} 
                                style={{ width: 40, height: 40 }}
                            />                        
                    </Marker>                
                ))}
                {filteredData.length > 1 && (
                    <MapViewDirections
                        origin={{
                            latitude: filteredData[0].latitude,
                            longitude: filteredData[0].longitude,
                        }}
                        destination={{
                            latitude: filteredData[filteredData.length - 1].latitude,
                            longitude: filteredData[filteredData.length - 1].longitude,
                        }}
                        waypoints={filteredData.slice(1, -1).map(point => ({
                            latitude: point.latitude,
                            longitude: point.longitude,
                        }))}
                        apikey={GOOGLE_API_KEY}
                        strokeColor="black"
                        strokeWidth={3}
                    />
                )}
            </MapView>
            <TextInput
                placeholder="Buscar clientes"
                value={searchTerm}
                onChangeText={(text) => {
                    setSearchTerm(text);
                }}
                style={styles.searchInput}
                placeholderTextColor="#4A4A4A"
            />
            <View style={styles.dateFilterContainer}>
                {(!showStartDatePicker && !showEndDatePicker) && (
                    <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateInput}>
                        <Text>{formatDate2(startDate)}</Text>
                    </TouchableOpacity>
                )}
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
                {(!showStartDatePicker && !showEndDatePicker) && (

                    <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateInput2}>
                        <Text>{formatDate2(endDate)}</Text>
                    </TouchableOpacity>
                )}

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
                {(!showStartDatePicker && !showEndDatePicker) && (
                    <TouchableOpacity style={styles.filterButton} onPress={() => fetchClients()}>
                        <FontAwesome name="filter" size={16} color="#D3423E#D3423E" style={{ marginRight: 5 }} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: width,
        height: height,
        position: "absolute"

    },
    cardList: {
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
    },
    cardsContainer: {
        position: "absolute",
        bottom: 30,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
        zIndex: 2,
    },
    searchInput: {
        position: "absolute",
        top: 60,
        left: 25,
        right: 25,
        zIndex: 1,
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 8,
        fontSize: 16,
        elevation: 5,
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
        backgroundColor: "#fff",
    },
    dateInput2: {
        flex: 1,
        backgroundColor: "white",
        padding: 10,
        borderRadius: 10,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    dateFilterContainer: {
        flexDirection: "row",
        position: "absolute",
        top: 105,
        left: 25,
        right: 25,
        zIndex: 1,
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 8,
        fontSize: 16,
        elevation: 5,
        justifyContent: "space-between",
        marginBottom: 5,
        marginTop: 5,
    },
    card: {
        width: width * 0.7,
        marginRight: 10,
        borderRadius: 15,
        overflow: "hidden",
        backgroundColor: "#fff",
        elevation: 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    cardImage: {
        width: 70,
        height: 70,
        borderRadius: 5,
        marginRight: 10,
        marginLeft: 10
    },
    cardInfo: {
        padding: 10,
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    cardAddressContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    cardAddress: {
        color: "gray",
        marginLeft: 5,
    },
    cardsWrapper: {
        position: "absolute",
        bottom: 30,
        width: width,
    },
    cardsContainer: {
        paddingHorizontal: 10,
        zIndex: 2,
    },
    locationIcon: {
        marginRight: 5,
    },
    loadingContainer: {
        position: "absolute",
        top: height / 2,
        left: width / 2 - 50,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: 10,
        borderRadius: 5,
    },
    clientDetailCard: {
        position: "absolute",
        left: 20,
        right: 20,
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 15,
        elevation: 5,
        alignItems: "center",
    },
    clientDetailName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    timerText: {
        fontSize: 18,
        marginVertical: 10,
    },
    redButton: {
        color: "#D3423E",
        padding: 10,
        borderRadius: 10,
        width: "80%",
        alignItems: "center",
        marginVertical: 5,
    },
    buttonText: {
        color: "#D3423E",
        fontSize: 16,
        fontWeight: "bold",
    },
    timerContainer: {
        position: "absolute",
        top: 90,
        left: "50%",
        transform: [{ translateX: -50 }],
        backgroundColor: "green",
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 10,
    },
    timerText: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
    },
    filterButton: {
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default MapScreenRoute;
