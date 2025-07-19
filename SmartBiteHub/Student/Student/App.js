import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking, Platform, Alert } from 'react-native';

// Common Screens
import SplashScreen from './src/screen/SplashScreen';
import RoleSelectionScreen from './src/screen/RoleSelectionScreen';
import ForgotPasswordScreen from './src/screen/ForgotPassword';
import ResetPasswordScreen from './src/screen/ResetPasswordScreen';

// Student Screens
import LoginScreen from './src/screen/LoginScreen';
import SignupScreen from './src/screen/SignupScreen';
import MainMenuScreen from './src/screen/MainMenuScreen';
import ConfirmOrderScreen from './src/screen/ConfirmOrderScreen';
import FeedbackScreen from './src/screen/FeedbackScreen';
import CancelOrderScreen from './src/screen/CancelOrderScreen';
import WalletBalance from './src/screen/WalletBalance';
import ConfirmPreOrderScreen from './src/screen/ConfirmPreOrderScreen';
import ConfirmBulkOrderScreen from './src/screen/ConfirmBulkOrderScreen';
import OrderReceiptScreen from './src/screen/OrderReceiptScreen';
import PreOrderPopup from './src/screen/PreOrderPopup';
import BulkOrderPopup from './src/screen/BulkOrderPopup';
import RegularOrderPopup from './src/screen/RegularOrderPopup'
// Faculty Screens
import FLoginScreen from './src/facultyScreens/FLoginScreen';
import FSignup from './src/facultyScreens/FSignup';
import FMainMenuScreen from './src/facultyScreens/FMainMenuScreen';
import FConfirmBulkOrderScreen from './src/facultyScreens/FConfirmBulkOrderScreen';
import FConfirmPreOrderScreen from './src/facultyScreens/FConfirmPreOrderScreen';
import FConfirmOrderScreen from './src/facultyScreens/FConfirmOrderScreen';
import FOrderReceiptScreen from './src/facultyScreens/FOrderReceiptScreen';
import Timer from './src/facultyScreens/Timer';
import FCancelOrderScreen from './src/facultyScreens/FCancelOrderScreen';
import DeliveryStatusScreen from './src/facultyScreens/DeliveryStatusScreen';
import FBulkpopup from './src/facultyScreens/FBulkpopup';
import FPreOrderPopup from './src/facultyScreens/FPreOrderPopup';
import FOrderPopup from './src/facultyScreens/FOrderPopup';
import FpreOrderReceiptScreen from './src/facultyScreens/FpreOrderReceipt';
import FpreCancelOrderScreen from './src/facultyScreens/FpreCancelOrderScreen';
import FbulkcancelOrder from './src/facultyScreens/FbulkcancelOrder';
import FbulkOrderReceipt from './src/facultyScreens/FbulkOrderReceipt';
import NotificationBanner from './src/facultyScreens/NotificationBanner.js';
const Stack = createStackNavigator();

const App = () => {

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SplashScreen">
        {/* Common Screens */}
        <Stack.Screen name="SplashScreen" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RoleSelectionScreen" component={RoleSelectionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} options={{ headerShown: false }} />

        {/* Student Flow */}
        <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignupScreen" component={SignupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MainMenuScreen" component={MainMenuScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ConfirmOrderScreen" component={ConfirmOrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ConfirmPreOrderScreen" component={ConfirmPreOrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OrderReceiptScreen" component={OrderReceiptScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ConfirmBulkOrderScreen" component={ConfirmBulkOrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FeedbackScreen" component={FeedbackScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CancelOrderScreen" component={CancelOrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WalletBalance" component={WalletBalance} options={{ headerShown: false }} />
        <Stack.Screen name='PreOrderPopup' component={PreOrderPopup} options={{ headerShown: false }} />
        <Stack.Screen name='BulkOrderPopup' component={BulkOrderPopup} options={{ headerShown: false }} />
        <Stack.Screen name='RegularOrderPopup' component={RegularOrderPopup} options={{ headerShown: false }} />
        {/* Faculty Flow */}
        <Stack.Screen name="FLoginScreen" component={FLoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FSignupScreen" component={FSignup} options={{ headerShown: false }} />
        <Stack.Screen name="FMainMenuScreen" component={FMainMenuScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FConfirmBulkOrderScreen" component={FConfirmBulkOrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FConfirmPreOrderScreen" component={FConfirmPreOrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FConfirmOrderScreen" component={FConfirmOrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FOrderReceiptScreen" component={FOrderReceiptScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Timer" component={Timer} options={{ headerShown: false }} />
        <Stack.Screen 
  name="FCancelOrderScreen" 
  component={FCancelOrderScreen} 
  options={{ headerShown: false }} 
/>
        <Stack.Screen name="DeliveryStatusScreen" component={DeliveryStatusScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FBulkpopup" component={FBulkpopup} options={{ headerShown: false }} />
        <Stack.Screen name="FpreOrderReceiptScreen" component={FpreOrderReceiptScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FPreOrderPopup" component={FPreOrderPopup} options={{ headerShown: false }} />
        <Stack.Screen name="FOrderPopup" component={FOrderPopup} options={{ headerShown: false }} />
        <Stack.Screen name="FbulkcancelOrder" component={FbulkcancelOrder} options={{ headerShown: false }} />
        <Stack.Screen name="FbulkOrderReceipt" component={FbulkOrderReceipt} options={{ headerShown: false }} />
        <Stack.Screen name="FpreCancelOrderScreen" component={FpreCancelOrderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NotificationBanner" component ={NotificationBanner} options={{headerShown:false}}/>
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;