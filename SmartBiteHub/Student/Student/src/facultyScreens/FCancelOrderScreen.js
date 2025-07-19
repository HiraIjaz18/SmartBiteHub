import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Animated, 
  ActivityIndicator,
  AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socket';

const FCancelOrderScreen = ({ route, navigation }) => {
  const { orderId, email, totalAmount = 0 } = route.params;
  const [remainingTime, setRemainingTime] = useState(300);
  const [isCancelling, setIsCancelling] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const verifyOrder = async () => {
      const [confirmationTime, storedOrderId] = await AsyncStorage.multiGet([
        'orderConfirmationTime',
        'currentOrderId'
      ]);

      if (storedOrderId[1] !== orderId) {
        Alert.alert('Invalid Order', 'This order cannot be cancelled');
        navigation.reset({ routes: [{ name: 'FMainMenuScreen' }]});
      }
    };
    verifyOrder();
  }, []);

  const calculateRemainingTime = (confirmationTime, serverTime = null) => {
    const now = serverTime ? new Date(serverTime).getTime() : Date.now();
    const elapsed = Math.floor((now - new Date(confirmationTime)) / 1000);
    return Math.max(300 - elapsed, 0);
  };

  useEffect(() => {
    const loadTimerState = async () => {
      try {
        const [confirmationTime, storedOrderId] = await AsyncStorage.multiGet([
          'orderConfirmationTime',
          'currentOrderId'
        ]);

        if (!confirmationTime[1] || storedOrderId[1] !== orderId) {
          Alert.alert('Order Mismatch', 'This order is no longer available');
          await AsyncStorage.multiRemove(['orderConfirmationTime', 'currentOrderId']);
          navigation.goBack();
          return;
        }

        const calculatedTime = calculateRemainingTime(confirmationTime[1]);
        setRemainingTime(calculatedTime);
        progress.setValue(calculatedTime / 300);
      } catch (error) {
        Alert.alert('Error', 'Failed to load order data');
        navigation.goBack();
      }
    };

    loadTimerState();

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && appState.current !== 'active') {
        try {
          const confirmationTime = await AsyncStorage.getItem('orderConfirmationTime');
          if (confirmationTime) {
            const calculatedTime = calculateRemainingTime(confirmationTime);
            setRemainingTime(calculatedTime);
          }
        } catch (error) {
          console.error('Error updating timer:', error);
        }
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let timer;
    if (remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = Math.max(prev - 1, 0);
          Animated.timing(progress, {
            toValue: newTime / 300,
            duration: 1000,
            useNativeDriver: false,
          }).start();
          return newTime;
        });
      }, 1000);
    } else {
      progress.setValue(0);
    }
    return () => clearInterval(timer);
  }, [remainingTime]);

  const cancelOrder = async () => {
    try {
      setIsCancelling(true);
      
      const response = await fetch('http://192.168.129.167:4000/api/Fcancel/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email, totalAmount }),
      });
  
      if (!response.ok) throw new Error('Cancellation failed');
      
      // Proper socket emission
      socketService.emitOrderCancellation(orderId, email);
  
     
      await AsyncStorage.multiRemove([
        'orderConfirmationTime', 
        'currentOrderId',
        'orderDetails'
      ]);
  
      navigation.reset({
        index: 0,
        routes: [{
          name: 'FMainMenuScreen',
          params: { refundAmount: totalAmount }
        }],
      });
      
    } catch (error) {
      Alert.alert('Error', error.message || 'Cancellation failed');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFF8F0', '#FFE4B5']} style={styles.background}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Cancellation Window:</Text>
          <Text style={styles.timer}>
            {Math.floor(remainingTime / 60)}:
            {(remainingTime % 60).toString().padStart(2, '0')}
          </Text>
          <Animated.View style={[styles.progressBar, { 
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            }) 
          }]} />
        </View>

        <TouchableOpacity
          style={[styles.button, (remainingTime <= 0 || isCancelling) && styles.disabledButton]}
          onPress={cancelOrder}
          disabled={remainingTime <= 0 || isCancelling}
        >
          {isCancelling ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {remainingTime > 0 ? 'Cancel Order' : 'Window Expired'}
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerLabel: {
    fontSize: 18,
    color: '#555',
    marginBottom: 10,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#8B0000',
    borderRadius: 4,
    width: '80%',
  },
  button: {
    backgroundColor: '#8B0000',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FCancelOrderScreen;