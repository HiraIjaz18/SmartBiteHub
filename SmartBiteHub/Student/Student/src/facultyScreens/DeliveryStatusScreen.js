import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Vibration
} from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import socketService from '../services/socket';
import NotificationBanner from '../facultyScreens/NotificationBanner';
import notificationService from '../services/notificationService';

const API_BASE_URL = 'http://172.21.12.246:4000';
const ORDER_CONFIG = { WINDOW_DURATION: 45 };

const DeliveryStatusScreen = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const nav = useNavigation();
  const route = useRoute();
  const timerRef = useRef();
  const isMounted = useRef(true);

  const getStatusIndex = () => {
    if (!order) return -1;
    const stages = ['pending', 'preparing', 'on the way', 'delivered'];
    return stages.indexOf(order.status.toLowerCase());
  };

  const calculateInitialTimeLeft = (orderData) => {
    if (!orderData) return 0;
    if (orderData.status === 'delivered') return 0;
    
    const now = new Date();
    try {
      if (orderData.status === 'preparing') {
        const prepEnd = new Date(orderData.timeline.preparationEnd);
        return Math.ceil((prepEnd - now) / 60000) + (orderData.deliveryTime || 30);
      }
      if (orderData.status === 'on the way') {
        const deliveryEnd = new Date(orderData.timeline.deliveryEnd);
        return Math.ceil((deliveryEnd - now) / 60000);
      }
      return orderData.totalTime || ORDER_CONFIG.WINDOW_DURATION + 30;
    } catch (e) {
      return ORDER_CONFIG.WINDOW_DURATION + 30;
    }
  };

  const fetchOrder = async (email, orderId) => {
    try {
      const endpoint = orderId 
        ? `${API_BASE_URL}/api/Forders/${orderId}`
        : `${API_BASE_URL}/api/Forders/active/${email}`;
      
      const { data } = await axios.get(endpoint);
      if (!data?.data) return null;

      return {
        ...data.data,
        totalTime: data.data.totalTime || 
          ORDER_CONFIG.WINDOW_DURATION + (data.data.deliveryTime || 30)
      };
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  };

  const handleOrderUpdate = (updatedOrder) => {
    if (!isMounted.current) return;
    clearInterval(timerRef.current);
    
    // Show notification
    notificationService.showNotification({
      title: updatedOrder.status === 'preparing' ? 'Cooking Started' :
             updatedOrder.status === 'on the way' ? 'On Its Way!' :
             'Order Delivered',
      message: updatedOrder.status === 'preparing' ? 'Your food is now being prepared' :
               updatedOrder.status === 'on the way' ? 'Your order is out for delivery' :
               'Your food has arrived!',
      type: 'status'
    });

    initializeOrder({
      ...updatedOrder,
      totalTime: updatedOrder.totalTime || 
        ORDER_CONFIG.WINDOW_DURATION + (updatedOrder.deliveryTime || 30)
    });
  };

  const setupSocketConnection = async (orderId, email) => {
    try {
      await socketService.connect();
      await socketService.joinOrderRoom(orderId, email);
      
      socketService.subscribe(`orderUpdate:${orderId}`, handleOrderUpdate);
      setConnectionStatus('Connected');
    } catch (error) {
      setConnectionStatus('Disconnected');
    }
  };

  const initializeOrder = (orderData) => {
    const timeLeft = calculateInitialTimeLeft(orderData);
    setOrder({ ...orderData, timeLeft });
    startCountdown(timeLeft);
  };

  const startCountdown = (initialTime) => {
    clearInterval(timerRef.current);
    let timeLeft = Math.max(0, initialTime);
    
    timerRef.current = setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 1);
      setOrder(prev => prev ? { ...prev, timeLeft } : prev);
      
      // Show time update notification every 15 minutes
      if (timeLeft % 15 === 0 && timeLeft > 0) {
        notificationService.showNotification({
          title: 'Time Update',
          message: `Approximately ${timeLeft} minutes remaining`,
          type: 'time'
        });
      }
    }, 60000);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const email = await AsyncStorage.getItem('email');
        if (!email) return nav.navigate('Login');
        
        const orderData = await fetchOrder(email, route.params?.orderId);
        if (!orderData) {
          setOrder(null);
          return setLoading(false);
        }
        
        await setupSocketConnection(orderData._id, email);
        initializeOrder(orderData);
      } catch (error) {
        Alert.alert("Error", "Failed to load order data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted.current = false;
      clearInterval(timerRef.current);
      socketService.disconnect();
    };
  }, [route.params?.orderId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>{connectionStatus}</Text>
      </View>
    );
  }

  const statusIndex = getStatusIndex();
  const timeText = order?.status === 'delivered' ? 'Delivered' :
    order?.timeLeft > 0 ? `${order.timeLeft} min left` : 'Arriving soon';
  const phaseText = order?.timeLeft > 0 ? 
    `${order.status === 'preparing' ? 'Preparation' : 'Delivery'} Time: ${order.timeLeft}m` : 
    'Finalizing your order';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <NotificationBanner />
      
      {!connectionStatus.includes('Connected') && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>{connectionStatus}</Text>
        </View>
      )}

      {order ? (
        <>
          <View style={styles.header}>
            <Text style={styles.orderNumber}>Order #{order._id.slice(-6).toUpperCase()}</Text>
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={18} color="white" />
              <Text style={styles.timeText}>{timeText}</Text>
            </View>
          </View>

          <View style={styles.timelineContainer}>
            {['Pending', 'Preparing', 'On the Way', 'Delivered'].map((stage, index) => (
              <View key={stage} style={styles.timelineStep}>
                <View style={[
                  styles.statusDot,
                  index <= statusIndex && styles.activeDot
                ]}>
                  {index <= statusIndex && <Feather name="check" size={14} color="white" />}
                </View>
                <Text style={styles.stageText}>{stage}</Text>
              </View>
            ))}
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            
            <View style={styles.timeContainer}>
              <Text style={styles.totalTimeText}>
                Total Estimated Time: {order.totalTime} minutes
              </Text>
              {order.timeLeft > 0 && (
                <Text style={styles.phaseTimeText}>{phaseText}</Text>
              )}
            </View>

            {order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              </View>
            ))}

            <View style={styles.detailRow}>
              <MaterialIcons name="location-pin" size={22} color="#666" />
              <Text style={styles.detailText}>
                {order.floor} Floor
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="confirmation-number" size={22} color="#666" />
              <Text style={styles.detailText}>Token: {order.token}</Text>
            </View>

            <View style={styles.detailRow}>
              <FontAwesome5 name="money-bill-wave" size={20} color="#666" />
              <Text style={styles.detailText}>Total: Rs. {order.totalPrice}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.cancelButton,
              ['delivered', 'cancelled'].includes(order.status) && styles.disabledButton
            ]}
            onPress={() => nav.navigate('FCancelOrderScreen', { 
              orderId: order._id,
              email: order.facultyEmail 
            })}
            disabled={['delivered', 'cancelled'].includes(order.status)}
          >
            <Feather name="x-circle" size={20} color="white" />
            <Text style={styles.buttonText}>
              {order.status === 'cancelled' ? 'Order Cancelled' : 'Cancel Order'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              order.status === 'delivered' ? styles.confirmButton : styles.disabledButton
            ]}
            onPress={async () => {
              try {
                await axios.put(`${API_BASE_URL}/api/Forders/${order._id}`, {
                  status: 'delivered'
                });
                setOrder(null);
              } catch (error) {
                Alert.alert("Error", "Failed to complete delivery");
              }
            }}
            disabled={order.status !== 'delivered'}
          >
            <Feather name="check-circle" size={20} color="white" />
            <Text style={styles.buttonText}>
              {order.status === 'delivered' ? 'Confirm Delivery' : `Status: ${order.status}`}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>No Active Orders</Text>
          <Text style={styles.emptySubText}>
            You don't have any ongoing orders at the moment
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    fontSize: 18,
    color: '#2c3e50',
    marginTop: 20
  },
  connectionBanner: {
    backgroundColor: '#e67e22',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center'
  },
  connectionText: {
    color: 'white',
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    padding: 18,
    backgroundColor: 'white',
    borderRadius: 14,
    elevation: 3
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50'
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    padding: 8,
    borderRadius: 20
  },
  timeText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600'
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  timelineStep: {
    alignItems: 'center',
    width: '23%'
  },
  statusDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  activeDot: {
    backgroundColor: '#27ae60'
  },
  stageText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center'
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 5
  },
  timeContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    padding: 18,
    marginBottom: 20
  },
  totalTimeText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
    textAlign: 'center'
  },
  phaseTimeText: {
    fontSize: 14,
    color: '#2196f3',
    textAlign: 'center',
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34495e',
    marginBottom: 18
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 10
  },
  itemName: {
    fontSize: 15,
    color: '#2c3e50'
  },
  itemQuantity: {
    fontSize: 15,
    color: '#7f8c8d'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12
  },
  detailText: {
    fontSize: 15,
    color: '#34495e',
    marginLeft: 15
  },
  actionButton: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    elevation: 3
  },
  confirmButton: {
    backgroundColor: '#27ae60'
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    marginBottom: 15
  },
  disabledButton: {
    backgroundColor: '#bdc3c7'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100
  },
  emptyText: {
    fontSize: 22,
    color: '#bdc3c7',
    marginTop: 25
  },
  emptySubText: {
    fontSize: 16,
    color: '#d5d8dc',
    marginTop: 12,
    textAlign: 'center'
  }
});

export default DeliveryStatusScreen;