import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TimerContext = createContext();

export const TimerProvider = ({ children }) => {
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  useEffect(() => {
    const loadStartTime = async () => {
      const start = await AsyncStorage.getItem("timer_start");
      if (start) {
        const elapsed = Math.floor((new Date() - new Date(start)) / 1000);
        setTimer(elapsed);
        setIsRunning(true);
        startInterval();
      }
    };
    loadStartTime();
  }, []);

  const startInterval = () => {
    const id = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    setIntervalId(id);
  };

  const startTimer = async () => {
    const startTime = new Date().toISOString();
    await AsyncStorage.setItem("timer_start", startTime);
    setTimer(0);
    setIsRunning(true);
    startInterval();
    return startTime;
  };

  const stopTimer = async () => {
    const stopTime = new Date().toISOString();
    await AsyncStorage.removeItem("timer_start");
    setIsRunning(false);
    setTimer(0);
    clearInterval(intervalId);
    return stopTime;
  };

  return (
    <TimerContext.Provider value={{ timer, isRunning, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  );
};
