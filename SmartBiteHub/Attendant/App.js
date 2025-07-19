import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert } from 'react-native';

// Screens
import SplashScreen from './src/screen/SplashScreen';
import LoginScreen from './src/screen/LoginScreen';
import SignupScreen from './src/screen/SignupScreen';
import AttOrders from './src/screen/AttOrders';
import Adashboard from './src/screen/Adashboard';
import Abulkorder from './src/screen/AbulkorderS';
import Apreorder from './src/screen/Apreorder';
const Stack = createStackNavigator();

const App = () => {
  // Remove Push Notification Configuration
  // and replace with Alert logic

  useEffect(() => {
    // Initialization for any setup if needed, for now we just use Alert for notifications
    Alert.alert("App Started", "Welcome to the Smart Bite Hub!");
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LoginScreen">
        <Stack.Screen 
          name="SplashScreen" 
          component={SplashScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="LoginScreen" 
          component={LoginScreen} 
        />
            
            <Stack.Screen
          name="Adashboard"
          component={Adashboard}
        />
        <Stack.Screen 
          name="SignupScreen" 
          component={SignupScreen} 
        />
         
        <Stack.Screen
          name="AttOrders"
          component={AttOrders}
        />
        <Stack.Screen
          name="Abulkorder"
          component={Abulkorder}        
        />
        <Stack.Screen
          name="Apreorder"  
          component={Apreorder}
        />
          </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
