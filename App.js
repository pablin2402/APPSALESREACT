import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './AuthContext';
import AppNavigator from './navigation/AppNavigator';
import AnimatedSplash from "./AnimatedSplash";

export default function App() {
  return (
    <AnimatedSplash>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </AnimatedSplash>
  );
}
