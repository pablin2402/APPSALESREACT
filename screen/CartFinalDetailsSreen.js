import React, { useState, useContext } from "react";

import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions, Modal, Image } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

import axios from "axios";
import { API_URL } from "../config";
import { AuthContext } from "../AuthContext";

export default function CartFinalDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const cart1 = route.params?.carts || [];
    const client1 = route.params?.client || [];
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState("");
    const [formData, setFormData] = useState({ tipoPago: "", plazoCredito: "" });
    const currentDate = new Date();
    const { token, idOwner, idUser } = useContext(AuthContext);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setIsPickerVisible(false);
    };
    const handleOpenPicker = (type) => {
        setPickerType(type);
        setIsPickerVisible(true);
    };

    const paymentTypes = ["Crédito", "Contado", "Cheque"];
    const creditTerms = ["1 Semana", "2 Semanas", "1 Mes", "45 Días"];
    const [cart, setCart] = useState(cart1);
    const [client] = useState(client1);


    const handleRemoveItem = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };
    const calcularTotal = () => {
        return parseFloat(cart.reduce(
            (sum, item) => sum + item.quantity * (item.price - (item.discount || 0)),
            0
        ).toFixed(2));
    };
    const calcularDescuentos = () => {
        return parseFloat(cart.reduce(
            (sum, item) => sum + item.quantity * (item.discount || 0),
            0
        ).toFixed(2));
    };
    const generateReceiveNumber = () => {
        return Math.floor(Math.random() * (1000000000 - 10000000) + 10000000);
    };
    const calcularFechaPago = (creationDate, plazoCredito) => {
        if (!creationDate) return "No disponible";

        const fecha = new Date(creationDate);

        if (!plazoCredito || plazoCredito.trim() === "") {
            return fecha.toLocaleDateString();
        }

        const cleanPlazo = plazoCredito.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        switch (cleanPlazo) {
            case "1 Semana":
                fecha.setDate(fecha.getDate() + 7);
                break;
            case "2 Semanas":
                fecha.setDate(fecha.getDate() + 14);
                break;
            case "1 Mes":
                fecha.setMonth(fecha.getMonth() + 1);
                break;
            case "45 Dias":
                fecha.setDate(fecha.getDate() + 45);
                break;
            default:
                return fecha;
        }

        return fecha;
    };
    async function getUserLocation() {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            alert("Permisos denegados");
            return;
        }
        let location = await Location.getCurrentPositionAsync({});
        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
    }
    const fetchActivity = async (selectedClient, text) => {
        try {
            console.log("ca")
            const userLocation = await getUserLocation();
            await axios.post(API_URL + "/whatsapp/salesman/activity", {
                salesMan: idUser,
                details: text,
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                location: selectedClient.client_location.direction,
                id_owner: idOwner,
                clientName: selectedClient._id,
                visitDuration: "00:00",
                visitDurationSeconds: 0,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log("hola")
        } catch (error) {
        } finally {
        }
    };
    const handleSubmit = async () => {

        if (cart.length === 0) {
            alert("Debe seleccionar al menos un producto.");
            return;
        }
        if (!formData.tipoPago) {
            alert("Debe seleccionar un tipo de pago.");
            return;
        }
        if (formData.tipoPago === "Crédito" && !formData.plazoCredito) {
            alert("Debe seleccionar un plazo para el crédito.");
            return;
        }
        try {
            const orderResponse =  Promise.race([

                 axios.post(API_URL + "/whatsapp/order", {
                    creationDate: currentDate,
                    receiveNumber: generateReceiveNumber(),
                    noteAditional: "",
                    id_owner: idOwner,
                    products: cart.map(item => ({
                        id: item.id,
                        nombre: item.productName,
                        cantidad: item.quantity,
                        precio: item.price,
                        unidadesPorCaja: item.numberofUnitsPerBox,
                        productImage: item.productImage,
                        caja: item.quantity / item.numberofUnitsPerBox,
                        lyne: item.categoryId.categoryName
                    })),
                    disscount: calcularDescuentos(),
                    tax: 0,
                    totalAmount: calcularTotal(),
                    nit: 0,
                    razonSocial: "",
                    cellPhone: 0,
                    direction: "No disponible",
                    accountStatus: formData.tipoPago,
                    dueDate: calcularFechaPago(currentDate, formData.tipoPago),
                    id_client: client1._id || "No seleccionado",
                    salesId: idUser,
                    region: "TOTAL CBB"

                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
            ]);
            if (orderResponse.status === 200) {
                alert("Orden guardada exitosamente.");
                fetchActivity(client1, "Pedido")
                setCart([]);
                navigation.navigate("Main", { screen: "Principal" });

                setFormData({ tipoPago: '', plazoCredito: '' });
                const clientId = orderResponse.data._id;
                const lat = 1;
                const lng = 1;

                try {
                    await axios.post(API_URL + "/whatsapp/order/track", {
                        orderId: clientId,
                        eventType: "Orden Creada",
                        triggeredBySalesman: idUser,
                        triggeredByDelivery: "",
                        triggeredByUser: "",
                        location: { lat, lng }
                    }, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    // setSalesData(response.data.products || []);
                    //setTotalPages(response.data.totalPages || 1);
                } catch (error) {
                    console.error("Error al enviar evento de orden:", error);
                } finally {
                }
            }
        } catch (error) {
            console.error("Error al enviar la orden:", error);

        } finally {
        }
    };


    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.totalContainer}>
                <Text style={styles.clientName}>{client.name} {client.lastName}</Text>
            </View>

            <View style={styles.formContainer}>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Tipo de pago</Text>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => handleOpenPicker("tipoPago")}
                    >
                        <Text style={styles.pickerButtonText}>
                            {formData.tipoPago || "Seleccione un tipo de pago"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {formData.tipoPago === "Crédito" && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Plazo de pago</Text>
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => handleOpenPicker("plazoCredito")}
                        >
                            <Text style={styles.pickerButtonText}>
                                {formData.plazoCredito || "Seleccione el plazo"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isPickerVisible && (
                    <Modal
                        transparent={true}
                        visible={isPickerVisible}
                        animationType="slide"
                        onRequestClose={() => setIsPickerVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Picker
                                    selectedValue={formData[pickerType]}
                                    onValueChange={(itemValue) => handleChange(pickerType, itemValue)}
                                    style={[styles.picker, { color: "#000" }]}                                >
                                    {(pickerType === "tipoPago" ? paymentTypes : creditTerms).map((item, index) => (
                                        <Picker.Item key={index} label={item} value={item} color="#000" />
                                    ))}
                                </Picker>

                            </View>
                        </View>
                    </Modal>
                )}
            </View>
            <ScrollView style={styles.cartList} contentContainerStyle={{ paddingBottom: 20 }}>
                {cart.map((item, index) => (
                    <View key={index} style={styles.card}>
                        <Image
                            source={{ uri: item.productImage || "https://via.placeholder.com/50" }}
                            style={styles.productImage}
                        />
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.productName}</Text>
                            <Text style={styles.price}>Bs {item.price.toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalSection}>
                            <Text style={styles.total}>Bs {(item.quantity * (item.price - (item.discount || 0))).toFixed(2)}</Text>
                            <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                                <Ionicons name="trash" size={20} color="#D3423E" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.summary}>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>

                    <Text style={styles.discountText}>Total Descuentos: </Text>
                    <Text style={styles.discountText}>Bs. {calcularDescuentos()}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>

                    <Text style={styles.totalText}>Total:</Text>
                    <Text style={styles.totalText}>Bs {calcularTotal()}</Text>
                </View>

                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleSubmit}
                >
                    <Text style={styles.continueButtonText}>Registrar</Text>
                </TouchableOpacity>
            </View>


        </View>
    );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#E7E6E6",
        padding: 20,
    },
    formContainer: {
        marginBottom: 20,
    },
    summary: {
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },

    totalContainer: {
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    clientName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333",
        marginBottom: 10,
    },
    pickerButton: {
        width: "100%",
        height: 40,
        borderWidth: 1,
        borderColor: "black",
        borderRadius: 25,
        backgroundColor: "#fff",
        justifyContent: "center",
        paddingLeft: 10,
        marginBottom: 15,
    },
    pickerButtonText: {
        fontSize: 16,
    },
    picker: {
        height: 200,
        width: "100%",
        color: "#fff",

    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 20,
    },
    modalCloseButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: "#D3423E",
        borderRadius: 5,
    },
    modalCloseText: {
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        paddingBottom: 5,
        marginBottom: 5,
    },
    headerText: {
        fontWeight: "bold",
        color: "#555",
        width: "20%",
        textAlign: "center",
        fontSize: 15,
    },
    cartList: {
        maxHeight: height * 0.65,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        paddingVertical: 10,
    },
    productName: {
        color: "#333",
        fontWeight: "bold",
        width: "20%",
        textAlign: "center",
    },
    finalPrice: {
        width: "20%",
        textAlign: "center",
        fontWeight: "bold",
        color: "#333",
    },
    deleteButton: {
        width: "10%",
        alignItems: "center",
    },
    totalContainer: {
        marginTop: 20,
        alignItems: "flex-end",
    },

    continueButton: {
        backgroundColor: "#D3423E",
        padding: 15,
        alignItems: "center",
        borderRadius: 25,
        marginTop: 10,
    },
    continueButtonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    cartList: {
        flex: 1,
    },
    card: {
        flexDirection: "row",
        padding: 12,
        backgroundColor: "#f9f9f9",
        borderRadius: 10,
        marginBottom: 10,
        alignItems: "center",
    },
    productImage: {
        width: 50,
        height: 90,
        marginRight: 10,
        resizeMode: "contain",
    },

    name: {
        fontSize: 13,
        color: "#333",
    },
    price: {
        color: "#333",
        marginTop: 4,
        fontSize: 18,
        fontWeight: "bold",

    },
    discount: {
        marginTop: 4,
        fontSize: 12,
        color: "#FFD700",
        fontWeight: "bold",
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 8,
    },
    quantityBtn: {
        padding: 6,
        borderRadius: 5,
        backgroundColor: "#eee",
    },
    quantityText: {
        marginHorizontal: 8,
        fontWeight: "bold",
        fontSize: 16,
        minWidth: 20,
        textAlign: "center",
    },
    totalSection: {
        alignItems: "flex-end",
    },
    total: {
        fontWeight: "bold",
        fontSize: 14,
        color: "#333",
        marginBottom: 5,
    },
    summary: {
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },
    discountText: {
        fontSize: 15,
        color: "#888",
        textAlign: "right",
        marginBottom: 4,
    },
    totalText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        textAlign: "right",
        marginBottom: 10,
    },
});
