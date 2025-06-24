// context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [token, setToken] = useState(null);
  const [idOwner, setIdOwner] = useState(null);
  const [idUser, setIdUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      const storedIdOwner = await AsyncStorage.getItem('id_owner');
      const storedUser = await AsyncStorage.getItem('id_user');

      
      setIsAuthenticated(!!storedToken);
      setToken(storedToken);
      setIdOwner(storedIdOwner);
      setIdUser(storedUser);
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const login = async (newToken, idOwner1, idUser1) => {
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('id_owner', idOwner1);
    await AsyncStorage.setItem('id_user', idUser1);

    setToken(newToken);
    setIdOwner(idOwner1);
    setIdUser(idUser1);

    setIsAuthenticated(true);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'id_user', 'id_owner']);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, checkingAuth, token,idOwner,idUser }}>
      {children}
    </AuthContext.Provider>
  );
};
