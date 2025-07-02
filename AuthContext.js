import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [token, setToken] = useState(null);
  const [idOwner, setIdOwner] = useState(null);
  const [idUser, setIdUser] = useState(null);
  const [role, setRole] = useState(null);
  const [salesId, setSalesId] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      const storedIdOwner = await AsyncStorage.getItem('id_owner');
      const storedUser = await AsyncStorage.getItem('id_user');
      const storesRole = await AsyncStorage.getItem('role');
      const sales = await AsyncStorage.getItem('sales_id');

      
      setIsAuthenticated(!!storedToken);
      setToken(storedToken);
      setIdOwner(storedIdOwner);
      setIdUser(storedUser);
      setRole(storesRole);
      setSalesId(sales);
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const login = async (newToken, idOwner1, idUser1,role,sales) => {
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('id_owner', idOwner1);
    await AsyncStorage.setItem('id_user', idUser1);
    await AsyncStorage.setItem('role', role);
    await AsyncStorage.setItem('sales_id', sales);

    setToken(newToken);
    setIdOwner(idOwner1);
    setIdUser(idUser1);
    setRole(role);
    setSalesId(sales);

    setIsAuthenticated(true);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'id_user', 'id_owner','role','sales_id']);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated,setIsAuthenticated, login, logout, checkingAuth, token,idOwner,idUser,role,salesId }}>
      {children}
    </AuthContext.Provider>
  );
};
