import React, { useContext } from "react";
import { View, StyleSheet,Dimensions } from "react-native";
import { AuthContext } from "../AuthContext";
import SalesManInfoScreen from "../components/SalesManInfoPage";
import DeliveryInfoPage from "../components/DeliveryInfoPage";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export default function UserInfoScreen() {
  const { role } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
       <View style={styles.svgContainer}>
      <Svg height={200} width={width} style={styles.wave}>
  <Path
    d={`
      M0,0 
      L0,80 
      C${width * 0.45},300 ${width * 0.75},40 ${width},190 
      L${width},0 
      Z
    `}
    fill="#D3423E"
  />
</Svg>

 
      
      </View>
        {role === "ADMIN" && <SalesManInfoScreen />}
        {role === "SALES" && <SalesManInfoScreen />}
        {role === "DELIVERY" && <DeliveryInfoPage />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  svgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  
});