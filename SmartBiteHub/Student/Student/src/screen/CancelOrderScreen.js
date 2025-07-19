import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SocketService from '../services/socket';

  const CancelOrderScreen = ({ route, navigation }) => {
    const { orderId, orderType } = route.params;
    const [remainingTime, setRemainingTime] = useState(300);
    const progress = useRef(new Animated.Value(1)).current;
    const countdownScale = useRef(new Animated.Value(1)).current;
  
    console.log('[CancelOrder] Component mounted', { 
      orderId,
      orderType,
      initialRemainingTime: remainingTime
    });
  
    // Socket event handlers
    const getSocketEvents = useCallback(() => {
      console.log('[CancelOrder] Getting socket events for order type:', orderType);
      const events = {
        student: { update: 'student_pre_order_update' },
        pre: { update: 'pre_order_update' },
        bulk: { update: 'bulk_order_update' },
        regular: { update: 'order_update' }
      }[orderType] || { update: 'order_update' };
      
      console.log('[CancelOrder] Selected socket events:', events);
      return events;
    }, [orderType]);
  
    // Socket update handler
    const handleSocketUpdate = useCallback((update) => {
      console.log('[CancelOrder] Received socket update:', update);
      if (update.status === 'Cancelled') {
        console.log('[CancelOrder] Cancellation confirmed via socket');
        Alert.alert(
          'Order Cancelled', 
          `Your order has been successfully cancelled. RS. ${update.refundAmount} has been refunded to your wallet.`,
          [
            { 
              text: 'OK', 
              onPress: async () => {
                try {
                  // Update local wallet balance
                  await AsyncStorage.setItem('walletBalance', update.newBalance.toString());
                  navigation.replace('MainMenuScreen');
                } catch (error) {
                  console.error('Error updating wallet balance:', error);
                  navigation.replace('MainMenuScreen');
                }
              }
            },
          ]
        );
      }
    }, [navigation]);
  
    // Socket setup
    useEffect(() => {
      const setupSocket = async () => {
        try {
          const email = await AsyncStorage.getItem('email');
          const { update } = getSocketEvents();
          
          await SocketService.connect();
          
          SocketService.socket.on(update, handleSocketUpdate);
          
          // Add wallet update listener
          SocketService.socket.on('wallet_update', (data) => {
            if (data.email === email?.trim().toLowerCase()) {
              AsyncStorage.setItem('walletBalance', data.balance.toString());
            }
          });
          
        } catch (error) {
          console.error('[CancelOrder] Socket setup error:', error);
        }
      };
    
      setupSocket();
    
      return () => {
        const { update } = getSocketEvents();
        if (SocketService.socket) {
          SocketService.socket.off(update);
          SocketService.socket.off('wallet_update');
          SocketService.disconnect();
        }
      };
    }, [orderId, orderType, handleSocketUpdate, getSocketEvents]);
  
    // Timer logic
    useEffect(() => {
      console.log('[CancelOrder] Initializing cancellation timer');
      const fetchOrderConfirmationTime = async () => {
        try {
          const orderConfirmationTime = await AsyncStorage.getItem('orderConfirmationTime');
          console.log('[CancelOrder] Retrieved confirmation time from storage:', orderConfirmationTime);
  
          if (orderConfirmationTime) {
            const currentTime = new Date();
            const confirmationTime = new Date(orderConfirmationTime);
            const elapsedTime = Math.floor((currentTime - confirmationTime) / 1000);
            const remaining = Math.max(300 - elapsedTime, 0);
            
            console.log('[CancelOrder] Time calculations:', {
              currentTime,
              confirmationTime,
              elapsedTime,
              remaining
            });
  
            setRemainingTime(remaining);
          }
        } catch (error) {
          console.error('[CancelOrder] Error fetching confirmation time:', error);
        }
      };
  
      fetchOrderConfirmationTime();
    }, []);
  
    useEffect(() => {
      console.log('[CancelOrder] Starting countdown timer');
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = prev > 0 ? prev - 1 : 0;
          console.log('[CancelOrder] Timer tick:', { previous: prev, newTime });
          return newTime;
        });
      }, 1000);
  
      Animated.timing(progress, {
        toValue: remainingTime / 300,
        duration: 1000,
        useNativeDriver: false,
      }).start();
  
      if (remainingTime > 0) {
        Animated.sequence([
          Animated.timing(countdownScale, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(countdownScale, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
      }
  
      return () => {
        console.log('[CancelOrder] Clearing countdown timer');
        clearInterval(timer);
      };
    }, [remainingTime]);
  
    // Cancel order handler
    const handleCancelOrder = async () => {
      console.log('[CancelOrder] Cancel button pressed, starting cancellation process');
      
      try {
        // 1. Get email with better error handling
        const email = await AsyncStorage.getItem('email');
        if (!email) {
          throw new Error('User email not found in storage');
        }
        
        const trimmedEmail = email.trim().toLowerCase();
        console.log('[CancelOrder] Retrieved email:', trimmedEmail);
    
        // 2. Make API call with timeout
        const response = await axios.post('http://172.21.12.17:4000/api/cancel/cancel-order', {
          orderId,
          email: trimmedEmail,
          orderType
        }, {
          timeout: 10000 // 10 second timeout
        });
    
        console.log('[CancelOrder] Server response:', response.data);
        
        if (response.data.success) {
          console.log('[CancelOrder] Server confirmed cancellation, removing confirmation time');
          await AsyncStorage.removeItem('orderConfirmationTime');
          
          // Show immediate feedback while waiting for socket confirmation
          Alert.alert(
            'Processing Cancellation', 
            'Your cancellation request is being processed. You will receive a confirmation shortly.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Cancellation Failed', response.data.message || 'Unknown error occurred');
        }
      } catch (error) {
        console.error('[CancelOrder] Full cancellation error:', error);
        
        let errorMessage = 'Failed to cancel order. Please try again.';
        
        if (error.message === 'User email not found in storage') {
          errorMessage = 'Please login again to perform this action.';
        } else if (error.response) {
          // Server responded with error status
          errorMessage = error.response.data.message || errorMessage;
          if (error.response.status === 404) {
            errorMessage = 'Order not found. It may have already been cancelled.';
          }
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please check your connection.';
        } else if (error.message.includes('Network Error')) {
          errorMessage = 'Unable to connect to server. Check your network connection.';
        }
        
        Alert.alert('Error', errorMessage);
      }
    };
  
    const handleProceed = () => {
      console.log('[CancelOrder] Back to Order Receipt');
      navigation.replace('OrderReceiptScreen');
    };
  
    // Render methods
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    const progressWidth = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });
  
    console.log('[CancelOrder] Rendering component', { minutes, seconds });
  
    return (
      <LinearGradient colors={['#FF6F61', '#FFD166']} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Cancel Order</Text>
          
          <Animated.Text style={[styles.subtitle, { transform: [{ scale: countdownScale }] }]}>
            You have {minutes}:{seconds.toString().padStart(2, '0')} to cancel
          </Animated.Text>
  
          <View style={styles.progressBarContainer}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
  
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancelOrder}
            testID="cancel-button"
          >
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
  
          <TouchableOpacity 
            style={styles.proceedButton} 
            onPress={handleProceed}
            testID="proceed-button"
          >
            <Text style={styles.proceedButtonText}>Back to Order Receipt</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 5,
    marginBottom: 30,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 5,
  },
  cancelButton: {
    width: '100%',
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: '#FF6F61',
    fontSize: 16,
    fontWeight: 'bold',
  },
  proceedButton: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  proceedButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CancelOrderScreen;