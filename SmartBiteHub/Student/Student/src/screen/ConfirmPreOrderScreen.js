import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PreOrderPopup from './PreOrderPopup';
import socketService from '../services/socket';

const ConfirmPreOrderScreen = ({ navigation }) => {
  const [state, setState] = useState({
    orderDetails: [],
    loading: true,
    confirming: false,
    totalAmount: 0,
    email: '',
    userName: '',
    remainingTime: 300,
    timerActive: false,
    showPreOrderPopup: false,
    currentOrderId: null
  });

  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

  // Socket initialization and cleanup
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        await socketService.connect();
      } catch (error) {
        console.error('Socket connection error:', error);
      }
    };
    initializeSocket();

    return () => {
      if (state.currentOrderId) {
        socketService.unsubscribeFromPreOrderUpdates(state.currentOrderId);
        socketService.leavePreOrderRoom(state.currentOrderId, state.email);
      }
    };
  }, []);

  // Timer management
  useEffect(() => {
    let timer;
    if (state.timerActive && state.remainingTime > 0) {
      timer = setInterval(() => {
        updateState(prev => ({ remainingTime: prev.remainingTime - 1 }));
      }, 1000);
    } else if (state.remainingTime <= 0) {
      updateState({ timerActive: false });
      Alert.alert('Time Expired', 'The cancellation period has ended.');
    }
    return () => clearInterval(timer);
  }, [state.timerActive, state.remainingTime]);

  const loadOrderData = async () => {
    try {
      const [storedOrderDetails, storedEmail, storedName] = await Promise.all([
        AsyncStorage.getItem('orderDetails'),
        AsyncStorage.getItem('email'),
        AsyncStorage.getItem('userName'),
      ]);

      if (!storedOrderDetails || !storedEmail) {
        throw new Error('No order details or email found');
      }

      const parsedOrderDetails = JSON.parse(storedOrderDetails);
      const total = parsedOrderDetails.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.orderQuantity) || 0;
        return sum + (price * quantity);
      }, 0);
      
      updateState({
        orderDetails: parsedOrderDetails,
        email: storedEmail,
        userName: storedName || '',
        totalAmount: total,
        loading: false
      });

    } catch (error) {
      console.error('Error loading order data:', error);
      Alert.alert('Error', 'Could not load order details. Please try again.');
      navigation.goBack();
    }
  };

  const handleAddPreOrderItems = (newItems) => {
    const updatedOrder = [...state.orderDetails, ...newItems];
    const total = updatedOrder.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.orderQuantity) || 0;
      return sum + (price * quantity);
    }, 0);
    
    updateState({
      orderDetails: updatedOrder,
      totalAmount: total,
      showPreOrderPopup: false
    });
  };

  const validatePreOrder = () => {
    const { orderDetails, userName } = state;
    const errors = [];
    
    if (!userName.trim()) errors.push('User name is required');
    
    orderDetails.forEach(item => {
      if (!item.itemName) errors.push('Item name is required');
      if (!item.price || isNaN(Number(item.price))) 
        errors.push(`Invalid price for ${item.itemName || 'item'}`);
      if (!item.orderQuantity || isNaN(Number(item.orderQuantity))) 
        errors.push(`Invalid quantity for ${item.itemName || 'item'}`);
      if (item.itemType !== 'Special') 
        errors.push(`Only special items can be pre-ordered: ${item.itemName}`);
    });

    if (orderDetails.length === 0) 
      errors.push('Please select at least one special item.');

    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return false;
    }
    return true;
  };

  const handleSocketUpdates = (orderId) => {
    socketService.subscribeToStudentPreOrderUpdates(orderId, (data) => {
      if (data.status === 'Cancelled') {
        Alert.alert(
          'Order Cancelled', 
          'Your pre-order has been cancelled by the restaurant.',
          [{ text: 'OK', onPress: () => navigation.navigate('OrderHistory') }]
        );
      }
      if (data.status === 'Completed') {
        Alert.alert(
          'Order Completed', 
          'Your pre-order has been fulfilled!',
          [{ text: 'OK', onPress: () => navigation.navigate('OrderHistory') }]
        );
      }
    });
  };

  const handleConfirmOrder = async () => {
    if (!validatePreOrder()) return;
    updateState({ confirming: true });
  
    try {
      // Prepare items with proper number conversion
      const orderItems = state.orderDetails.map(item => ({
        itemName: item.itemName,
        itemType: 'Special',
        quantity: Number(item.orderQuantity) || 0,
        itemPrice: Number(item.price) || 0, // Ensure price is converted to number
      }));

      // Calculate total with proper number conversion
      const totalPrice = orderItems.reduce((sum, item) => 
        sum + (item.itemPrice * item.quantity), 0);

      // 1. Create Pre-Order
      const orderResponse = await fetch('http://172.21.12.17:4000/api/preorder/preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          totalPrice: totalPrice.toFixed(2),
          email: state.email,
          orderDate: new Date().toISOString()
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.message || 'Order failed');

      // 2. Navigate to receipt with properly formatted data
      navigation.navigate('OrderReceiptScreen', {
        orderDetails: {
          orderId: orderData.order._id,
          token: orderData.order.token || orderData.token,
          items: orderItems.map(item => ({
            itemName: item.itemName,
            quantity: item.quantity,
            itemPrice: item.itemPrice, // Consistent property name
          })),
          email: state.email,
          userName: state.userName,
          totalPrice: totalPrice,
          isPreOrder: true,
          orderType: 'pre',
          status: 'Pending' // Add initial status
        }
      });

      // 3. Process other operations in background
      setTimeout(async () => {
        try {
          // Wallet deduction
          await fetch('http://172.21.12.17:4000/api/wallets/wallet/deduct', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${orderData.token}`
            },
            body: JSON.stringify({ 
              amount: totalPrice, 
              email: state.email,
              orderId: orderData.order._id
            }),
          });

          // Inventory update
          await fetch('http://172.21.12.17:4000/api/daily/update-availability', {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${orderData.token}`
            },
            body: JSON.stringify({
              items: orderItems.map(item => ({
                itemName: item.itemName,
                quantity: item.quantity,
              })),
              orderId: orderData.order._id,
              isPreOrder: true
            }),
          });

          // Socket operations
          await socketService.joinStudentPreOrderRoom(orderData.order._id, state.email);
          handleSocketUpdates(orderData.order._id);

          // Update local storage
          await AsyncStorage.multiRemove(['orderDetails']);
          await AsyncStorage.multiSet([
            ['orderConfirmationTime', new Date().toISOString()],
            ['currentOrderId', orderData.order._id],
            ['orderType', 'pre-order'],
          ]);
        } catch (backgroundError) {
          console.error('Background operations error:', backgroundError);
        }
      }, 0);

    } catch (error) {
      Alert.alert('Order Failed', error.message);
      updateState({ confirming: false });
    }
  };

  useEffect(() => {
    loadOrderData();
  }, []);

  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre-Order Summary</Text>
        <View style={styles.headerIcon}>
          <Icon name="restaurant" size={24} color="white" />
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <>
            {state.timerActive && (
              <View style={styles.timerContainer}>
                <Icon name="timer" size={20} color="#8B0000" />
                <Text style={styles.timerText}>
                  Time to cancel: {formatTime(state.remainingTime)}
                </Text>
              </View>
            )}
            <Text style={styles.sectionTitle}>Your Pre-Order</Text>
          </>
        }
        data={state.orderDetails}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.itemName}</Text>
              <View style={styles.preOrderBadge}>
                <Text style={styles.preOrderBadgeText}>Pre-Order</Text>
              </View>
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemPrice}>Rs {Number(item.price).toFixed(2)}</Text>
              <Text style={styles.itemQuantity}>× {Number(item.orderQuantity)}</Text>
              <Text style={styles.itemTotal}>
                Rs {(Number(item.price) * Number(item.orderQuantity)).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
        keyExtractor={(item, index) => `${item._id || index}`}
        ListEmptyComponent={
          <View style={styles.emptyOrderContainer}>
            <Icon name="fastfood" size={40} color="#8B0000" />
            <Text style={styles.emptyOrderText}>No pre-order items selected</Text>
          </View>
        }
        ListFooterComponent={
          <>
            <TouchableOpacity 
              style={styles.addMoreButton}
              onPress={() => updateState({ showPreOrderPopup: true })}
            >
              <Icon 
                name={state.orderDetails.length > 0 ? "edit" : "add"} 
                size={20} 
                color="#8B0000" 
              />
              <Text style={styles.addMoreText}>
                {state.orderDetails.length > 0 ? "Edit Pre-Order" : "Add Items"}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>
                Rs {Number(state.totalAmount).toFixed(2)}
              </Text>
            </View>

            <View style={styles.deliveryCard}>
              <Text style={styles.deliveryCardTitle}>Customer Information</Text>
              <View style={styles.deliveryInfoRow}>
                <View style={styles.deliveryIconContainer}>
                  <Icon name="person" size={20} color="#8B0000" />
                </View>
                <View style={styles.deliveryTextContainer}>
                  <Text style={styles.deliveryLabel}>Name</Text>
                  <Text style={styles.deliveryValue}>{state.userName || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.deliveryInfoRow}>
                <View style={styles.deliveryIconContainer}>
                  <Icon name="email" size={20} color="#8B0000" />
                </View>
                <View style={styles.deliveryTextContainer}>
                  <Text style={styles.deliveryLabel}>Email</Text>
                  <Text style={styles.deliveryValue}>{state.email}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.confirmButton,
                (state.confirming || state.orderDetails.length === 0) && styles.disabledButton
              ]}
              onPress={handleConfirmOrder}
              disabled={state.confirming || state.orderDetails.length === 0}
            >
              {state.confirming ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>CONFIRM PRE-ORDER</Text>
              )}
            </TouchableOpacity>

            {state.timerActive && (
              <View style={styles.timerAlertContainer}>
                <Icon name="warning" size={20} color="#8B0000" />
                <Text style={styles.timerAlertText}>
                  You can cancel this order within {formatTime(state.remainingTime)}
                </Text>
              </View>
            )}
          </>
        }
      />

      <PreOrderPopup
        visible={state.showPreOrderPopup}
        onClose={() => updateState({ showPreOrderPopup: false })}
        onAddItems={handleAddPreOrderItems}
        currentOrder={state.orderDetails}
      />
    </SafeAreaView>
  );
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F9',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B0000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#8B0000',
    elevation: 4,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFE4E1',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    color: '#8B0000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
    color: '#8B0000',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  preOrderBadge: {
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  preOrderBadgeText: {
    color: '#8B0000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#228B22',
  },
  emptyOrderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyOrderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8B0000',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#8B0000',
    borderRadius: 8,
    marginBottom: 16,
  },
  addMoreText: {
    color: '#8B0000',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#228B22',
  },
  deliveryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deliveryCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B0000',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE4E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deliveryTextContainer: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  deliveryValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#8B0000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    elevation: 2,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  timerAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE4E1',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  timerAlertText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#8B0000',
  },
});

export default ConfirmPreOrderScreen;