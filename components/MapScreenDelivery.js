import React, { useEffect, useState, useRef, useContext } from "react";
import { View, ScrollView, Dimensions, Text, Image, TouchableOpacity, Modal, Platform, TextInput, Button } from "react-native";
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
import { GOOGLE_API_KEY } from "../config";

import axios from "axios";
import { API_URL } from "../config";

import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";

import { FontAwesome } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext";
import styles from "../styles/MapScreenStyles";

const MapScreenDelivery = () => {

    const [clients, setClients] = useState([]);
    const [origin, setOrigin] = useState({ latitude: 0, longitude: 0 });
    const mapRef = useRef(null);
    const [filteredData, setFilteredData] = useState([]);
    const [routeId, setRouteId] = useState("");
    const [route, setRoute] = useState(null);

    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [detailsFilter] = useState("");
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [selectedClient1, setSelectedClient1] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [showRoute, setShowRoute] = useState(false);

    const { token, idOwner, idUser } = useContext(AuthContext);

    const getRoutesById = async (value) => {
        try {
            const response = await axios.post(
                API_URL + "/whatsapp/delivery/list/route/id",
                {
                    _id: value,
                    id_owner: idOwner,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
    
            if (
                response.status === 200 &&
                response.data.length > 0 &&
                response.data[0].route.length > 1
            ) {
                setRoute(response.data);        
                setShowRoute(true);            
            } else {
                console.warn("La ruta está vacía o incompleta.");
            }
        } catch (error) {
            console.error("Error al obtener la ruta:", error);
        }
    };
    
    
    useEffect(() => {
        getUserLocation()
    }, [])
    const fetchClients = async () => {
        try {
            const response = await axios.post(API_URL + "/whatsapp/delivery/list/route", {
                id_owner: idOwner,
                startDate: startDate,
                endDate: endDate,
                delivery: idUser,
                page: 1,
                excludeComplete: false,
                status: "Finalizado",
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setClients(response.data.data || []);
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
        fetchClients();
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
    const formatDate = (dateString) => {
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
                style={{ flex: 1 }}
                initialRegion={{
                    latitude: -17.38156252481452,
                    longitude: -66.1613705009222,
                    latitudeDelta: 0.09,
                    longitudeDelta: 0.04,
                }}
                showsUserLocation={true}
            >
                {showRoute && route[0].route.length > 1 && (
                    <MapViewDirections
                        origin={origin}
                        destination={{
                            latitude: parseFloat(route[0].route[route[0].route.length - 1].client_location.latitud),
                            longitude: parseFloat(route[0].route[route[0].route.length - 1].client_location.longitud),
                        }}
                        waypoints={route[0].route.slice(0, -1).map((point) => ({
                            latitude: parseFloat(point.client_location.latitud),
                            longitude: parseFloat(point.client_location.longitud),
                        }))}
                        apikey={GOOGLE_API_KEY}
                        strokeColor="black"
                        strokeWidth={3}
                    />
                )}
                {showRoute && route[0].route.map((point) => (
                    <Marker
                        key={point._id}
                        coordinate={{
                            latitude: parseFloat(point.client_location.latitud),
                            longitude: parseFloat(point.client_location.longitud),
                        }}
                        title={`${point.name} ${point.lastName}`}
                        description={point.client_location.direction}
                    >
                        <View style={{ width: 40, height: 40 }}>
                            <Image
                                source={require("../icons/tienda.png")}
                                style={{ width: 40, height: 40, resizeMode: 'contain' }}
                            />
                            {point.visitStatus && (
                                <View
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        right: 0,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: "#27AE60",
                                        borderRadius: 6,
                                        borderWidth: 2,
                                        borderColor: "#fff",
                                    }}
                                />
                            )}
                        </View>
                    </Marker>
                ))}

            </MapView>

            <View style={styles.cardsWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                        clients?.length === 0
                            ? styles.emptyScrollContainer
                            : styles.cardsContainer
                    }
                >
                    {clients && clients.length > 0 ? (
                        clients.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.card1}
                                onPress={() => {
                                    setRouteId(item._id);
                                    getRoutesById(item._id);
                                }}
                            >
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle2}>{item.details}</Text>
                                    <View style={styles.cardAddressContainer}>
                                        <Text style={styles.cardAddress}>
                                            Fecha de Inicio: {formatDate(item.startDate)}
                                        </Text>
                                    </View>

                                    <View style={styles.progressBackground}>
                                        <View
                                            style={[
                                                styles.progressBar,
                                                { width: `${item.progress || 0}%`, backgroundColor: '#27AE60' },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.progressText}>{item.progress || 0}%</Text>
                                </View>
                            </TouchableOpacity>

                        ))
                    ) : (
                        <View style={styles.emptyCard}>
                            <Ionicons name="location-outline" size={40} color="#ccc" style={{ marginBottom: 10 }} />
                            <Text style={styles.emptyCardTextTitle}>Sin rutas asignadas</Text>
                            <Text style={styles.emptyCardTextSubtitle}>No hay rutas disponibles para hoy.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
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
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{
                        width: '90%',
                        backgroundColor: 'white',
                        borderRadius: 10,
                        padding: 20,
                        maxHeight: '80%'
                    }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 30, marginBottom: 20, textAlign: 'center' }}>
                            {selectedClient1?.name} {selectedClient1?.lastName}
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ fontWeight: '600', fontSize: 18 }}>Sucursal:</Text>
                            <Text style={{ fontSize: 18 }}>{selectedClient1?.client_location?.sucursalName}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ fontWeight: '600', fontSize: 18 }}>Dirección:</Text>
                            <Text style={{ fontSize: 18, flex: 1, textAlign: 'right' }}>{selectedClient1?.client_location?.direction}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={{ fontWeight: '600', fontSize: 18 }}>Tiempo de visita:</Text>
                            <Text style={{ fontSize: 18 }}>{selectedClient1?.visitTime}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontWeight: '600', fontSize: 18 }}>Estado:</Text>
                            <Text
                                style={{
                                    backgroundColor: selectedClient1?.visitStatus ? '#16A34A' : '#DC2626',
                                    color: 'white',
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 9999,
                                    fontSize: 12,
                                    fontWeight: '500',
                                }}
                            >
                                {selectedClient1?.visitStatus ? 'VISITADO' : 'SIN VISITAR'}
                            </Text>
                        </View>

                        <Image
                            source={{ uri: selectedClient1?.identificationImage }}
                            style={{ width: "100%", height: 150, borderRadius: 8, marginBottom: 20 }}
                            resizeMode="cover"
                        />

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#D3423E',
                                paddingVertical: 12,
                                borderRadius: 20,
                                alignItems: 'center',
                                width: '100%',
                            }}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                CERRAR
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>


        </View>
    );
};

export default MapScreenDelivery;
