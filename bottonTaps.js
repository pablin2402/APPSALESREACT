import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import MapScreen from "./screen/MapScreen";
import OrderScreen from "./screen/OrderScreen";
import PrincipalScreen from "./screen/PrincipalScreen";
import UserInfoScreen from "./screen/UserInfoScreen"; 

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size, focused }) => {
            let iconName;

            if (route.name === "principal") iconName = "home-outline";
            else if (route.name === "order") iconName = "receipt-outline";
            else if (route.name === "map") iconName = "map-outline";
            else if (route.name === "userInfo") iconName = "person-outline";

            return (
              <Ionicons
                name={iconName}
                size={size}
                color={focused ? "#D3423E" : "gray"}
              />
            );
          },
          tabBarActiveTintColor: "#D3423E",
          tabBarInactiveTintColor: "gray",
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "white",
            paddingBottom: 15,
            height: 80,
            paddingTop: 10,
          },
        })}
      >
        <Tab.Screen name="principal" component={PrincipalScreen} />
        <Tab.Screen name="order" component={OrderScreen} />
        <Tab.Screen name="map" 
          component={MapScreen} 
          listeners={({ navigation }) => ({
            tabPress: e => {
              const state = navigation.getState();
              const nonFocusedTab = state.routes.find(r => r.name === "map");
              const isFocused = state.index === state.routes.indexOf(nonFocusedTab);
        
              if (isFocused && nonFocusedTab.state?.routes?.length > 1) {
                e.preventDefault(); 
                navigation.navigate("map"); 
              }
            },})}
        />
        <Tab.Screen name="userInfo" 
          component={UserInfoScreen} 
          listeners={({ navigation }) => ({
            tabPress: e => {
              const state = navigation.getState();
              const nonFocusedTab = state.routes.find(r => r.name === "userInfo");
              const isFocused = state.index === state.routes.indexOf(nonFocusedTab);
        
              if (isFocused && nonFocusedTab.state?.routes?.length > 1) {
                e.preventDefault(); 
                navigation.navigate("userInfo"); 
              }
            },})}
          />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
