import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

const Abulkorder = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://172.21.12.98:4000/api/Abulkorder/delivery-orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch delivery orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateDeliveryStatus = async (orderId) => {
    try {
      const response = await fetch(`http://172.21.12.98:4000/api/Abulkorder/delivery-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Delivered' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update delivery status');
      }

      const updatedOrder = await response.json();
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: updatedOrder.order.status } : order
        )
      );
      Alert.alert('Success', 'Delivery status updated successfully');
    } catch (error) {
      console.error('Error updating delivery status:', error);
      Alert.alert('Error', 'Failed to update delivery status. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA500" />
        <Text style={styles.loadingText}>Loading delivery orders...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFA500']} />
      }
    >
      <View style={styles.container}>
        <Text style={styles.title}>Delivery Orders for Tomorrow</Text>

        {orders.length === 0 ? (
          <View style={styles.noOrdersContainer}>
            <Text style={styles.noOrdersText}>No orders available for delivery.</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Order ID: {order._id}</Text>
                <Text
                  style={[
                    styles.status,
                    order.status === 'Pending' ? styles.statusPending : styles.statusDelivered,
                  ]}
                >
                  {order.status}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.detail}>Item: {order.itemName}</Text>
                <Text style={styles.detail}>Wing: {order.wing}</Text>
                <Text style={styles.detail}>Floor: {order.floor}</Text>
                <Text style={styles.detail}>Room: {order.roomNumber}</Text>
              </View>
              {order.status === 'Pending' && (
                <TouchableOpacity
                  style={styles.deliverButton}
                  onPress={() => updateDeliveryStatus(order._id)}
                >
                  <Text style={styles.buttonText}>Mark as Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, padding: 16, backgroundColor: '#FFFFFF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: { fontSize: 18, color: '#FFA500', marginTop: 16 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: { fontSize: 16, fontWeight: '600', color: '#333333' },
  status: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: { backgroundColor: '#FFD700', color: '#8B0000' },
  statusDelivered: { backgroundColor: '#98FB98', color: '#006400' },
  cardBody: { marginBottom: 12 },
  detail: { fontSize: 14, color: '#333333', marginBottom: 6 },
  deliverButton: {
    padding: 12,
    backgroundColor: '#FFA500',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  noOrdersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  noOrdersText: { fontSize: 18, color: '#777777', textAlign: 'center' },
});

export default Abulkorder;

