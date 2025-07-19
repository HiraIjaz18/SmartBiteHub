import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import BulkOrderPopup from './BulkOrderPopup';
import SocketService from '../services/socket';

const ConfirmBulkOrderScreen = ({ navigation }) => {
  const isMounted = useRef(true);
  const [state, setState] = useState({
    orderDetails: [],
    loading: true,
    confirming: false,
    totalAmount: 0,
    email: '',
    userName: '',
    remainingTime: 300,
    timerActive: false,
    showBulkOrderPopup: false,
    showSuccess: false,
    currentOrderId: null
  });

  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Clean up any active socket connections
      if (state.currentOrderId) {
        SocketService.unsubscribeFromStudentBulkOrderUpdates(state.currentOrderId);
      }
    };
  }, [state.currentOrderId]);

  const updateState = useCallback((updates) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatDate = useCallback((date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }, []);

  const handleSocketUpdates = useCallback((orderId) => {
    const handleBulkOrderUpdate = (data) => {
      if (data.orderId === orderId && data.status === 'Cancelled') {
        Alert.alert('Order Cancelled', 'Your bulk order has been successfully cancelled');
        updateState({ timerActive: false, currentOrderId: null });
      }
    };

    SocketService.subscribeToStudentBulkOrderUpdates(orderId, handleBulkOrderUpdate);
    return () => SocketService.unsubscribeFromStudentBulkOrderUpdates(orderId);
  }, [updateState]);

  const loadOrderData = useCallback(async () => {
    try {
      const [storedOrderDetails, storedEmail, storedName] = await Promise.all([
        AsyncStorage.getItem('orderDetails'),
        AsyncStorage.getItem('email'),
        AsyncStorage.getItem('userName') 
      ]);

      if (!storedOrderDetails || !storedEmail) {
        throw new Error('No order details or email found');
      }

      const parsedOrderDetails = JSON.parse(storedOrderDetails);
      const total = parsedOrderDetails.reduce((sum, item) => sum + item.price * item.orderQuantity, 0);
      
      updateState({
        orderDetails: parsedOrderDetails,
        email: storedEmail,
        userName: storedName || '',
        totalAmount: total,
        loading: false,
        showSuccess: false
      });

    } catch (error) {
      Alert.alert('Error', 'Could not load order details. Please try again.');
      navigation.goBack();
    }
  }, [navigation, updateState]);

  const handleAddBulkOrderItems = useCallback((newItems) => {
    const existingItemsMap = new Map();
    state.orderDetails.forEach(item => {
      existingItemsMap.set(item.itemName.toLowerCase(), item);
    });
  
    const mergedItems = newItems.map(newItem => {
      const existingItem = existingItemsMap.get(newItem.name.toLowerCase());
      return existingItem 
        ? { ...existingItem, orderQuantity: newItem.orderQuantity }
        : { ...newItem, itemName: newItem.name };
    });
    
    const totalAmount = mergedItems.reduce((sum, item) => sum + item.price * item.orderQuantity, 0);
    
    updateState({
      orderDetails: mergedItems,
      totalAmount,
      showBulkOrderPopup: false
    });
  }, [state.orderDetails, updateState]);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  const validateBulkOrder = useCallback(() => {
    const { orderDetails } = state;
    const errors = [];
  
    if (orderDetails.length === 0) errors.push('Please select at least one item.');
    const totalQuantity = orderDetails.reduce((sum, item) => sum + item.orderQuantity, 0);
    if (totalQuantity < 6) errors.push('Minimum total quantity for bulk orders is 6.');
    
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return false;
    }
    return true;
  }, [state.orderDetails]);

  const handleConfirmOrder = useCallback(async () => {
    if (!validateBulkOrder() || state.confirming) return;
    
    updateState({ confirming: true });

    try {
      const orderData = {
        items: state.orderDetails.map(item => ({
          itemName: item.itemName,
          itemType: item.itemType || 'Regular',
          quantity: item.orderQuantity,
          itemPrice: item.price,
        })),
        totalPrice: state.totalAmount,
        status: 'Pending',
        userId: state.email,
        userName: state.userName,
        orderDate: new Date().toISOString(),
        pickupDate: tomorrow.toISOString(), 
        email: state.email,
      };

      const response = await fetch('http://172.21.12.17:4000/api/bulkorder/bulk-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error(await response.text() || 'Failed to create bulk order');
      
      const responseData = await response.json();
      if (!responseData.success) throw new Error('Order creation failed');

      // Process successful order
      const orderId = responseData.order._id;
      updateState({ currentOrderId: orderId });

      // 1. Wallet deduction
      const walletResponse = await fetch('http://172.21.12.17:4000/api/wallets/wallet/deduct', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${responseData.token}`
        },
        body: JSON.stringify({ 
          amount: state.totalAmount, 
          email: state.email,
        }),
      });
      if (!walletResponse.ok) throw new Error('Wallet deduction failed');

      // 2. Inventory update
      const inventoryResponse = await fetch('http://172.21.12.17:4000/api/daily/update-availability', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${responseData.token}`
        },
        body: JSON.stringify({
          items: state.orderDetails.map(item => ({
            itemName: item.itemName,
            quantity: Number(item.orderQuantity),
          })),
          orderId,
          isBulkOrder: true
        }),
      });
      if (!inventoryResponse.ok) throw new Error('Inventory update failed');

      // 3. Socket setup
      await SocketService.joinStudentBulkOrderRoom(orderId, state.email);
      handleSocketUpdates(orderId);

      // 4. Update storage
      await AsyncStorage.multiRemove(['orderDetails']);
      await AsyncStorage.multiSet([
        ['orderConfirmationTime', new Date().toISOString()],
        ['currentOrderId', orderId],
        ['orderType', 'bulk'],
      ]);

      // 5. Navigate to receipt
      if (isMounted.current) {
        navigation.navigate('OrderReceiptScreen', {
          orderDetails: {
            orderId,
            token: orderData.order.token || orderData.token,
            items: state.orderDetails.map(item => ({
              itemName: item.itemName,
              itemPrice: item.itemPrice,
              quantity:item.quantity,
            })),
            email: state.email,
            userName: state.userName,
            status: 'Pending',
            pickupDate: tomorrow.toISOString(),
            totalPrice : state.totalAmount,
            orderDate: new Date().toISOString(),
            isBulkOrder: true,
            orderType: 'bulk'
          }
        });
      }

    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Order Failed', error.message || 'Failed to confirm the order. Please try again.');
        updateState({ confirming: false });
      }
    }
  }, [state, validateBulkOrder, updateState, tomorrow, handleSocketUpdates, navigation]);

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
        <Text style={styles.headerTitle}>Bulk Order Summary</Text>
        <View style={styles.headerIcon}>
          <Icon name="restaurant" size={24} color="white" />
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.contentContainer}
        data={state.orderDetails}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.itemName}</Text>
              {item.itemType === 'Special' && (
                <View style={styles.preOrderBadge}>
                  <Text style={styles.preOrderBadgeText}>Pre-Order</Text>
                </View>
              )}
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemPrice}>Rs {item.price.toFixed(2)}</Text>
              <Text style={styles.itemQuantity}>× {item.orderQuantity}</Text>
              <Text style={styles.itemTotal}>Rs {(item.price * item.orderQuantity).toFixed(2)}</Text>
            </View>
          </View>
        )}
        keyExtractor={(item, index) => `${item._id || index}`}
        ListEmptyComponent={
          <View style={styles.emptyOrderContainer}>
            <Icon name="fastfood" size={40} color="#8B0000" />
            <Text style={styles.emptyOrderText}>No items selected</Text>
          </View>
        }
        ListHeaderComponent={
          <>
            <View style={styles.timerWrapper}>
              <View style={styles.timerContainer}>
                <Icon name="timer" size={20} color="#8B0000" />
                <Text style={styles.timerText}>
                  {state.timerActive 
                    ? `Time to cancel: ${formatTime(state.remainingTime)}` 
                    : `Pickup on ${formatDate(tomorrow)}`}
                </Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Your Bulk Order</Text>
          </>
        }
        ListFooterComponent={
          <>
            <TouchableOpacity 
              style={styles.addMoreButton}
              onPress={() => updateState({ showBulkOrderPopup: true })}
            >
              <Icon name={state.orderDetails.length > 0 ? "edit" : "add"} size={20} color="#8B0000" />
              <Text style={styles.addMoreText}>
                {state.orderDetails.length > 0 ? "Edit Order" : "Add Items"}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>Rs {state.totalAmount.toFixed(2)}</Text>
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
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="white" style={styles.loadingIndicator} />
                  <Text style={styles.confirmButtonText}>PROCESSING...</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>CONFIRM BULK ORDER</Text>
              )}
            </TouchableOpacity>
          </>
        }
      />

      <BulkOrderPopup
        visible={state.showBulkOrderPopup}
        onClose={() => updateState({ showBulkOrderPopup: false })}
        onComplete={handleAddBulkOrderItems}
        initialItems={state.orderDetails}
      />
    </SafeAreaView>
  );
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
  timerWrapper: {
    paddingHorizontal: 16,
    marginTop: 8,
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#CCC',
    opacity: 0.7,
  },
   container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
});

export default ConfirmBulkOrderScreen; 