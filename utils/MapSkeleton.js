import {
  View,
    Animated,
      Easing
} from "react-native";
import React, { useRef,useEffect } from "react";

export const ShimmerBlock = ({ width: w, height: h, style, radius = 8 }) => {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(shimmer, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, [shimmer]);
    const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-150, 250] });
    return (
        <View style={[{ width: w, height: h, borderRadius: radius, backgroundColor: "#e5e7eb", overflow: "hidden" }, style]}>
            <Animated.View style={{ width: 100, height: "100%", backgroundColor: "rgba(255,255,255,0.6)", transform: [{ translateX }, { skewX: "-20deg" }] }} />
        </View>
    );
};

export const SkeletonHeader = () => (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 6 }}>
            <ShimmerBlock width={110} height={16} radius={6} />
            <ShimmerBlock width={150} height={11} radius={4} />
        </View>
        <ShimmerBlock width={90} height={32} radius={10} />
    </View>
);
export const SkeletonSearchBar = () => (
  <View style={{
    flexDirection: "row",
    gap: 10,
  }}>
    <ShimmerBlock width="100%" height={46} radius={14} style={{ flex: 1 }} />
    <ShimmerBlock width={46} height={46} radius={14} />
  </View>
);

export const SkeletonStopCard = () => (
    <View style={{ width: 224, backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.04)", shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4 }}>
        <ShimmerBlock width="100%" height={110} radius={0} />
        <View style={{ padding: 12, gap: 8 }}>
            <ShimmerBlock width={130} height={14} radius={5} />
            <ShimmerBlock width={170} height={11} radius={4} />
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <ShimmerBlock width={80} height={18} radius={999} />
                <ShimmerBlock width={16} height={16} radius={4} />
            </View>
        </View>
    </View>
);