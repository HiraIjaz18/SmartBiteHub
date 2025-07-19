import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { initSocket, subscribeToOrders, unsubscribeFromOrders } from '../services/socketService';

const Apreorder = ({ navigation, route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const attendantId = route.params?.attendantId; // Get from navigation

  // Socket and data setup
  useEffect(() => {
    const token = 'your-auth-token'; // Get from your auth system
    const newSocket = initSocket(token, attendantId);
    setSocket(newSocket);

    const handleNotification = (type, data) => {
      Alert.alert(
        type === 'reminder' ? 'Delivery Reminder' : 'Delivery Time',
        data.message,
        [{ text: 'OK', onPress: () => fetchOrders() }]
      );
    };

    subscribeToOrders(newSocket, handleNotification);

    return () => {
      unsubscribeFromOrders(newSocket);
      newSocket.disconnect();
    };
  }, [attendantId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://172.21.12.98:4000/api/attendant/delivery-orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const updateDeliveryStatus = async (orderId, status) => {
    try {
      const response = await fetch(`http://172.21.12.98:4000/api/attendant/delivery-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const formatDeliveryInfo = (order) => {
    return `${new Date(order.deliveryDate).toLocaleDateString()} at ${order.deliveryTime}`;
  };
  return (
    <LinearGradient colors={['#FFCC00', '#FF9900']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Today's Deliveries</Text>
        
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No deliveries scheduled for today</Text>
          </View>
        ) : (
          orders.map(order => (
            <View key={order._id} style={styles.card}>
              <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
              <Text style={styles.deliveryTime}>
                Delivery at: {formatDeliveryTime(order.deliveryDate)}
              </Text>
              
              <View style={styles.itemsContainer}>
                {order.items.map((item, index) => (
                  <Text key={index} style={styles.itemText}>
                    {item.quantity}x {item.itemName}
                  </Text>
                ))}
              </View>
              
              <Text style={styles.location}>
                {order.wing}, Floor {order.floor}, Room {order.roomNumber}
              </Text>
              
              <Text style={[
                styles.status,
                order.status === 'Completed' && styles.statusCompleted,
                order.status === 'Ready for Delivery' && styles.statusReady
              ]}>
                Status: {order.status}
              </Text>
              
              <View style={styles.buttonContainer}>
                {order.status === 'Ready for Delivery' && (
                  <TouchableOpacity
                    style={[styles.button, styles.deliverButton]}
                    onPress={() => updateDeliveryStatus(order._id, 'Completed')}
                  >
                    <Text style={styles.buttonText}>Mark as Delivered</Text>
                  </TouchableOpacity>
                )}
                
                {order.status === 'Pending' && (
                  <TouchableOpacity
                    style={[styles.button, styles.prepareButton]}
                    onPress={() => updateDeliveryStatus(order._id, 'Preparing')}
                  >
                    <Text style={styles.buttonText}>Start Preparing</Text>
                  </TouchableOpacity>
                )}
                
                {order.status === 'Preparing' && (
                  <TouchableOpacity
                    style={[styles.button, styles.readyButton]}
                    onPress={() => updateDeliveryStatus(order._id, 'Ready for Delivery')}
                  >
                    <Text style={styles.buttonText}>Ready for Delivery</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#008000',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  deliveryTime: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  itemsContainer: {
    marginBottom: 10,
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  location: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
    color: '#444',
  },
  status: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
    color: '#E67E22',
  },
  statusCompleted: {
    color: '#27AE60',
  },
  statusReady: {
    color: '#2980B9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 10,
  },
  deliverButton: {
    backgroundColor: '#27AE60',
  },
  prepareButton: {
    backgroundColor: '#E67E22',
  },
  readyButton: {
    backgroundColor: '#2980B9',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
});

export default Apreorder;