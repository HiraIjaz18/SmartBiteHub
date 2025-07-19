// FbulkCancelOrderScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Animated,
  AppState,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socket';

const FbulkcancelOrder = ({ route, navigation }) => {
  const { orderId } = route.params || {};
  const [remainingTime, setRemainingTime] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidOrder, setIsValidOrder] = useState(null);
  const [initialized, setInitialized] = useState(false); // Add this state
  const progress = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);
  const socketRef = useRef(null);

  // Derived values
  const minutes = Math.floor((remainingTime || 0) / 60);
  const seconds = (remainingTime || 0) % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const timeExpired = remainingTime !== null && remainingTime <= 0;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  const validateSession = async () => {
    try {
      console.log('[Validation] Starting validation for order:', orderId);
      
      const [confirmationTime, storedOrderId, orderType] = await AsyncStorage.multiGet([
        'orderConfirmationTime', 'currentOrderId', 'orderType'
      ]);

      console.log('[Validation] Retrieved from storage:', {
        confirmationTime: confirmationTime[1],
        storedOrderId: storedOrderId[1],
        orderType: orderType[1]
      });

      if (!orderId) {
        console.error('[Validation] Missing orderId in route params');
        return { valid: false, timeLeft: 0 };
      }

      if (!storedOrderId[1] || !confirmationTime[1]) {
        console.error('[Validation] Missing data in AsyncStorage');
        return { valid: false, timeLeft: 0 };
      }

      const orderValid = (
        storedOrderId[1] === orderId &&
        orderType[1] === 'bulk'
      );

      console.log(`[Validation] Order validity check: ${orderValid}`, {
        storedOrderId: storedOrderId[1],
        incomingOrderId: orderId,
        orderType: orderType[1]
      });

      const orderTime = new Date(confirmationTime[1]);
      const now = new Date();
      const elapsed = Math.floor((now - orderTime) / 1000);
      const timeLeft = Math.max(0, 300 - elapsed);

      console.log('[Validation] Time calculations:', {
        orderTime: orderTime.toISOString(),
        now: now.toISOString(),
        elapsedSeconds: elapsed,
        timeLeft
      });

      return { valid: orderValid, timeLeft };

    } catch (error) {
      console.error('[Validation] Error:', error);
      return { valid: false, timeLeft: 0 };
    }
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.multiRemove([
        'orderConfirmationTime',
        'currentOrderId',
        'orderDetails',
        'orderType'
      ]);
      console.log('[Storage] Successfully cleared order data');
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
    }
  };

  const initSocket = async () => {
    try {
      console.log('[Socket] Initializing socket connection');
      await socketService.connect();
      socketRef.current = socketService;
      
      socketService.subscribe('bulk_order_cancelled', (data) => {
        console.log('[Socket] Received cancellation update:', data);
        if (data.orderId === orderId) {
          handleSuccessfulCancellation(data);
        }
      });
      
      console.log('[Socket] Connection established successfully');
      return true;
    } catch (error) {
      console.error('[Socket] Connection failed:', error);
      return false;
    }
  };

  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('[AppState] Previous:', appState.current, 'Next:', nextAppState);
      
      if (appState.current.match(/inactive|background/) && 
          nextAppState === 'active') {
        console.log('[AppState] App came to foreground');
        const { valid, timeLeft } = await validateSession();
        console.log('[AppState] Revalidation result:', valid);
        
        if (!valid) {
          console.log('[AppState] Session invalid, navigating back');
          Alert.alert('Session Expired', 'Cancellation window has closed');
          navigation.goBack();
        } else {
          setRemainingTime(timeLeft);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (socketRef.current) {
        console.log('[Socket] Cleaning up socket subscriptions');
        socketRef.current.unsubscribe('bulk_order_cancelled');
      }
    };
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[Initialization] Starting initialization');
        const socketConnected = await initSocket();
        console.log('[Initialization] Socket connected:', socketConnected);
        
        const { valid, timeLeft } = await validateSession();
        console.log('[Initialization] Order valid:', valid);
        
        setIsValidOrder(valid);
        setRemainingTime(timeLeft);
        
        if (!valid) {
          console.warn('[Initialization] Invalid order detected');
          Alert.alert(
            'Invalid Order', 
            'This order cannot be cancelled. Either the cancellation window has expired or the order is invalid.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (error) {
        console.error('[Initialization] Error:', error);
        setIsValidOrder(false);
        navigation.goBack();
      } finally {
        setInitialized(true); // Mark initialization as complete
      }
    };
    
    initialize();
  }, []);

  useEffect(() => {
    if (remainingTime === null || timeExpired) return;

    console.log('[Timer] Starting countdown timer');
    
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          console.log('[Timer] Time expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log('[Timer] Cleaning up timer');
      clearInterval(timer);
    };
  }, [timeExpired]);

  useEffect(() => {
    if (remainingTime === null) return;
    
    console.log('[Progress] Updating progress bar:', remainingTime);
    
    Animated.timing(progress, {
      toValue: remainingTime / 300,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [remainingTime]);

  const handleSuccessfulCancellation = async (data) => {
    console.log('[Cancellation] Handling successful cancellation', data);
    await clearStorage();
    Alert.alert(
      'Order Cancelled', 
      `Your bulk order has been successfully cancelled. Refunded: ₹${data.refundAmount}`,
      [{ text: 'OK', onPress: () => navigation.replace('FMainMenuScreen') }]
    );
  };

  const handleCancel = async () => {
    if (timeExpired || isSubmitting || remainingTime === null || !isValidOrder) {
      console.warn('[Cancellation] Cancel prevented - invalid state', {
        timeExpired,
        isSubmitting,
        remainingTime,
        isValidOrder
      });
      return;
    }
    
    console.log('[Cancellation] Initiating cancellation');
    setIsSubmitting(true);
    
    try {
      const email = await AsyncStorage.getItem('email');
      console.log('[Cancellation] Retrieved email:', email);
      
      if (!email) throw new Error('Authentication required');
  
      console.log('[Socket] Joining bulk order room:', orderId);
      await socketRef.current.joinBulkOrderRoom(orderId, email);
      
      console.log('[API] Sending bulk cancellation request');
      const response = await fetch('http://172.21.12.246:4000/api/Fbulkcancel/Fcancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email }),
      });
  
      const responseData = await response.json();
      console.log('[API] Cancellation response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Cancellation failed');
      }
  
      // Success handling - server should emit socket event
      console.log('[Cancellation] Cleaning up and showing success');
      await clearStorage();
      Alert.alert(
        'Order Cancelled', 
        `Your bulk order has been successfully cancelled.`,
        [{ text: 'OK', onPress: () => navigation.replace('FMainMenuScreen') }]
      );
  
    } catch (error) {
      console.error('[Cancellation] Error:', error);
      Alert.alert(
        'Cancellation Failed', 
        error.message || 'Failed to cancel order. Please try again.'
      );
    } finally {
      console.log('[Cancellation] Cleaning up submission state');
      setIsSubmitting(false);
    }
  };

  if (!initialized) {
    console.log('[Render] Showing loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (isValidOrder === false) {
    console.log('[Render] Showing invalid order state');
    return (
      <LinearGradient colors={['#1E3A8A', '#1E40AF']} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Invalid Order</Text>
          <Text style={styles.errorText}>
            This bulk order cannot be cancelled or has already been processed.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  console.log('[Render] Showing main cancellation UI');
  return (
    <LinearGradient colors={['#1E3A8A', '#1E40AF']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Cancel Bulk Order</Text>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            {timeExpired ? 'Cancellation window closed' : `Time remaining: ${timeDisplay}`}
          </Text>
          <View style={styles.progressBar}>
            <Animated.View style={[
              styles.progressFill,
              { width: progressWidth },
              timeExpired && styles.expiredProgress
            ]} />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (timeExpired || isSubmitting) && styles.disabledButton
          ]}
          onPress={handleCancel}
          disabled={timeExpired || isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Processing...' : 'Cancel Bulk Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B00ff00',
  },
  content: {
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: 'white',
    marginBottom: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  timerText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 5,
  },
  expiredProgress: {
    backgroundColor: '#EF4444',
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FbulkcancelOrder;