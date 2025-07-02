import React, { useContext } from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import PrincipalScreen from "../screen/PrincipalScreen";
import UserInfoScreen from "../screen/UserInfoScreen";
import AccountScreen from "../screen/AccountScreen";
import AccountDeliveryScreen from "../screen/AccountDeliveryScreen";
import ProductListScreen from "../screen/ProductListScreen";
import MapScreen from "../screen/MapScreen";
import SalesInformScreen from "../screen/SalesInformScreen";
import ClientScreen from "../screen/ClientScreen";
import ClientDetailsScreen from "../screen/ClientDetailsScreen";
import CartDetailsScreen from "../screen/CartDetailsScreen";
import OrderDetailsScreen from "../screen/OrderDetailsScreen";
import ClientOrderDetailsScreen from "../screen/ClientOrderDetailsScreen";
import CartFinalDetailsScreen from "../screen/CartFinalDetailsSreen";
import SalesManActivityScreen from "../screen/SalesManActivityScreen";
import MapScreenRoute from "../screen/MapScreenRoute";
import AddPayment from "../screen/AddPayment";
import OrderPickUp from "../components/OrderPickUp";
import LocationTracker from "../components/LocationTracker";
import PaymentScreen from "../screen/PaymentScreen";
import LoginScreen from "../screen/LoginScreen";
import MapDelivery from "../components/MapDelivery";

import TimerBanner from "../components/TimerBanner";
import { TimerProvider } from "../components/TimerContext";
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
import { AuthContext } from "../AuthContext";
import OrderDetailsScreenDeliver from "../components/OrderDetailsScreenDeliver";

function UserStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="UserInfo"
                component={UserInfoScreen}
            />
            <Stack.Screen
                name="AccountScreen"
                component={AccountScreen}
                options={({ navigation }) => ({
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                    headerTitle: '',
                    headerStyle: { shadowColor: 'transparent', elevation: 0 },
                })} />
            <Stack.Screen
                name="AccountDeliveryScreen"
                component={AccountDeliveryScreen}
                options={({ navigation }) => ({
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                    headerTitle: '',
                    headerStyle: { shadowColor: 'transparent', elevation: 0 },
                })} />
            <Stack.Screen
                name="ClientScreen"
                component={ClientScreen}
                options={({ navigation }) => ({
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                    headerTitle: '',
                    headerStyle: { shadowColor: 'transparent', elevation: 0 },
                })} />
            <Stack.Screen
                name="ClientDetailsScreen"
                component={ClientDetailsScreen}
                initialParams={{ client: null }}
                options={({ navigation }) => ({
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                    headerTitle: '',
                    headerStyle: { shadowColor: 'transparent', elevation: 0 },
                })} />
            <Stack.Screen
                name="SalesManActivityScreen"
                component={SalesManActivityScreen}
                options={({ navigation }) => ({
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                    headerTitle: '',
                    headerStyle: { shadowColor: 'transparent', elevation: 0 },
                })} />

            <Stack.Screen
                name="CartDetailsScreen"
                component={CartDetailsScreen}
                initialParams={{ carts: null }}
                options={({ navigation }) => ({
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                    headerTitle: '',
                    headerStyle: { shadowColor: 'transparent', elevation: 0 },
                })} />

            <Stack.Screen
                name="MapScreenRoute"
                component={MapScreenRoute}
                options={({ navigation }) => ({
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                    headerTitle: '',
                    headerStyle: { shadowColor: 'transparent', elevation: 0 },
                })} />
        </Stack.Navigator>

    );
}
function ProductStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProductListScreen" component={ProductListScreen} />
            <Stack.Screen
                name="CartDetailsScreen"
                component={CartDetailsScreen}
                initialParams={{ carts: null }}
                options={({ navigation }) => ({
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                    headerTitle: "",
                    headerStyle: { shadowColor: "transparent", elevation: 0 },
                })}
            />
        </Stack.Navigator>
    );
}

function BottomTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let iconName;
                    if (route.name === "Principal") iconName = "home-outline";
                    else if (route.name === "Order") iconName = "time-outline";
                    else if (route.name === "Map") iconName = "map-outline";
                    else if (route.name === "User") iconName = "person-outline";
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: "#D3423E",
                tabBarInactiveTintColor: "gray",
                tabBarShowLabel: false,
                tabBarStyle: { backgroundColor: "white", paddingBottom: 15, height: 80 },
            })}
        >
            <Tab.Screen name="Principal" component={PrincipalScreen} options={{ headerShown: false }}
            />
            <Tab.Screen name="Order" component={ProductStack} options={{ headerShown: false }}
            />
            <Tab.Screen name="Map" component={MapScreen} options={{ headerShown: false }}
            />
            <Tab.Screen name="User" component={UserStack} options={{ headerShown: false }}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { isAuthenticated, checkingAuth } = useContext(AuthContext);
    if (checkingAuth) return null;

    return (
        <TimerProvider>
            <TimerBanner />
            {isAuthenticated && <LocationTracker />}
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                    
                ) : (
                    <>
                        <Stack.Screen name="Main" component={BottomTabs} />
                        <Stack.Screen
                            name="ClientOrderDetailsScreen"
                            component={ClientOrderDetailsScreen}
                            initialParams={{ carts: null }}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: "",
                                headerStyle: { shadowColor: "transparent", elevation: 0 },
                            })}
                        />
                        <Stack.Screen
                            name="CartFinalDetailsScreen"
                            component={CartFinalDetailsScreen}
                            initialParams={{ carts: null, client: null }}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: "",
                                headerStyle: { shadowColor: "transparent", elevation: 0 },
                            })}
                        />
                        <Stack.Screen
                            name="OrderDetailsScreen"
                            component={OrderDetailsScreen}
                            initialParams={{ products: null, files: null, orderId: null }}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: '',
                                headerStyle: { shadowColor: 'transparent', elevation: 0 },
                            })} />
                        <Stack.Screen
                            name="OrderDetailsScreenDeliver"
                            component={OrderDetailsScreenDeliver}
                            initialParams={{ products: null, files: null, orderId: null }}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: '',
                                headerStyle: { shadowColor: 'transparent', elevation: 0 },
                            })} />
                        <Stack.Screen
                            name="PaymentScreen"
                            component={PaymentScreen}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: '',
                                headerStyle: { shadowColor: 'transparent', elevation: 0 },
                            })} />
                        <Stack.Screen
                            name="SalesInformScreen"
                            component={SalesInformScreen}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: '',
                                headerStyle: { shadowColor: 'transparent', elevation: 0 },
                            })} />
                        <Stack.Screen
                            name="AddPayment"
                            component={AddPayment}
                            initialParams={{ client: null, order: null, debt: null }}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: '',
                                headerStyle: { shadowColor: 'transparent', elevation: 0 },
                            })} />
                        <Stack.Screen
                            name="OrderPickUp"
                            component={OrderPickUp}
                            initialParams={{ client: null }}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: '',
                                headerStyle: { shadowColor: 'transparent', elevation: 0 },
                            })} />
                        <Stack.Screen
                            name="MapDelivery"
                            component={MapDelivery}
                            options={({ navigation }) => ({
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                                        <Ionicons name="arrow-back" size={24} color="black" />
                                    </TouchableOpacity>
                                ),
                                headerTitle: '',
                                headerStyle: { shadowColor: 'transparent', elevation: 0 },
                            })} />
                    </>
                )}
            </Stack.Navigator>
        </TimerProvider>
    );
}
