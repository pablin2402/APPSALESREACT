import React, { useEffect, useRef, useState } from "react";
import { View, Image, Animated, Easing, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync().catch(() => {});

const BRAND = "#C43B37";

export default function AnimatedSplash({ children }) {
  const [done, setDone] = useState(false);

  const badgeScale = useRef(new Animated.Value(0.55)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeSpin = useRef(new Animated.Value(0)).current;

  const ringScale = useRef(new Animated.Value(0.85)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      Animated.parallel([
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(badgeSpin, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
      ]),

      Animated.sequence([
        Animated.timing(ringOpacity, {
          toValue: 0.55,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.5,
            duration: 850,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      ]),

      Animated.delay(400),

      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 480,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setDone(true));
  }, []);

  const spin = badgeSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["-25deg", "0deg"],
  });

  return (
    <View style={{ flex: 1 }}>
      {children}

      {!done && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, s.overlay, { opacity: fadeOut }]}
        >
          <View style={s.badgeArea}>
         
            <Animated.View
              style={{
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }, { rotate: spin }],
              }}
            >
              <Image
                source={require("./icons/aplicaciones.png")}
                style={s.logo}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    backgroundColor: BRAND,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  badgeArea: {
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
  ring: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});