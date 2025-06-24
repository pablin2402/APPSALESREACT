import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { TimerContext } from "./TimerContext";

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TimerBanner = () => {
    
  const { timer, isRunning } = useContext(TimerContext);

  if (!isRunning) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{formatTime(timer)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
        top: 160,
        left: "50%",
        transform: [{ translateX: -50 }],
        backgroundColor: "green",
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 25,
        zIndex: 999,

  },
  text: {
    color: "white",
        fontSize: 20,
        fontWeight: "bold",
  },
});

export default TimerBanner;
