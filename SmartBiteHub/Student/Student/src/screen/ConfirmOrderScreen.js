import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import socketService from '../services/socket';
import RegularOrderPopup from './RegularOrderPopup';

// Constants

const MAX_QUANTITY_PER_ITEM = 10;

const ConfirmOrderScreen = ({ navigation }) => {
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showRegularPopup, setShowRegularPopup] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const [storedOrderDetails, storedEmail, storedName] = await Promise.all([
          AsyncStorage.getItem('orderDetails'),
          AsyncStorage.getItem('email'),
          AsyncStorage.getItem('userName')
        ]);

        if (storedOrderDetails && storedEmail) {
          const parsedDetails = JSON.parse(storedOrderDetails);
          setOrderDetails(parsedDetails);
          setEmail(storedEmail);
          setUserName(storedName || '');

          const total = parsedDetails.reduce((sum, item) => 
            sum + (item.price || 0) * (item.orderQuantity || 0), 0
          );
          setTotalAmount(total);
        }
      } catch (error) {
        console.error('Storage fetch failed:', error);
        Alert.alert('Error', 'Could not load order details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();

    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const manageSocket = async () => {
      try {
        const isConnected = await socketService.isConnected();
        if (!isConnected) {
          await socketService.connect();
        }

        if (currentOrderId && isMounted) {
          await socketService.joinStudentOrderRoom(currentOrderId, email);
          socketService.subscribeToStudentOrderUpdates(currentOrderId, handleOrderUpdate);
          socketService.subscribe('student_inventory_update', handleInventoryUpdate);
          setSocketInitialized(true);
        }
      } catch (error) {
        console.error('Socket connection error:', error);
      }
    };

    const handleOrderUpdate = (update) => {
      if (update.orderId === currentOrderId) {
        Alert.alert('Order Updated', `Status: ${update.status}`);
      }
    };

    const handleInventoryUpdate = () => {
      Alert.alert('Menu Updated', 'Item availability changed');
    };

    if (currentOrderId && !socketInitialized) {
      manageSocket();
    }

    return () => {
      isMounted = false;
      if (currentOrderId) {
        socketService.unsubscribeFromStudentOrderUpdates(currentOrderId);
        socketService.unsubscribe('student_inventory_update');
      }
    };
  }, [currentOrderId, email, socketInitialized]);

  const validateOrder = () => {
    const errors = [];
    
    if (!orderDetails || orderDetails.length === 0) {
      errors.push('Please add at least one item to your order');
    }
    
    if (totalAmount <= 0) {
      errors.push('Invalid total amount - please check your order');
    }
    
    if (!email || !email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      errors.push('Please enter a valid email address');
    }

    orderDetails.forEach(item => {
      const itemName = item.name || item.itemName || 'Unknown Item';
      
      if (!item.orderQuantity || item.orderQuantity <= 0) {
        errors.push(`Invalid quantity for ${itemName} - must be at least 1`);
      }
      
      if (item.orderQuantity > MAX_QUANTITY_PER_ITEM) {
        errors.push(`Maximum ${MAX_QUANTITY_PER_ITEM} allowed for ${itemName}`);
      }
      
      if (!item.price || item.price <= 0) {
        errors.push(`Invalid price for ${itemName}`);
      }
    });

    return errors;
  };

  const handleConfirmOrder = async () => {
    if (processing) return;

    const errors = validateOrder();
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setProcessing(true);

    try {
      
      const orderData = {
        items: orderDetails.map(item => ({
          itemName: item.itemName,
          quantity: item.orderQuantity,
          price: item.price,
        })),
        totalPrice: totalAmount,
        email: email.trim().toLowerCase(),
        userType: 'student',
        orderDate: new Date().toISOString()
      };

      // Create order
      const orderResponse = await fetch(`http://172.21.12.17:4000/api/orders/order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-auth-token'
        },
        body: JSON.stringify(orderData),
      });

      const orderResult = await orderResponse.json();
      const orderId = orderResult.order?._id || orderResult.orderId;

      if (!orderResponse.ok) throw new Error(orderResult.message || 'Order failed');

      setCurrentOrderId(orderResult.orderId);

      // Process payment
      const paymentResponse = await fetch(`http://172.21.12.17:4000/api/wallets/wallet/deduct`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${orderResult.token}`
        },
        body: JSON.stringify({ 
          amount: totalAmount, 
          email: email,
          orderId: orderResult.orderId
        }),
      });

      if (!paymentResponse.ok) throw new Error('Payment failed');

      // Update inventory
      const inventoryResponse = await fetch(`http://172.21.12.17:4000/api/daily/update-availability`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${orderResult.token}`
        },
        body: JSON.stringify({
          items: orderDetails.map(item => ({
            itemName: item.itemName || item.name,
            quantity: item.orderQuantity,
          })),
          orderId: orderResult.orderId
        }),
      });

      if (!inventoryResponse.ok) throw new Error('Inventory update failed');

      await AsyncStorage.multiRemove(['orderDetails']);
      await AsyncStorage.setItem('orderConfirmationTime', new Date().toISOString());
      setOrderConfirmed(true);
      
      navigation.navigate('OrderReceiptScreen', {
        orderDetails: {
          ...orderResult,
          orderId: orderId,
          items: orderDetails.map(item => ({
            itemName: item.itemName,
            itemPrice: item.price,  // Changed from price -> itemPrice
            quantity: item.orderQuantity,  // Changed from orderQuantity -> quantity
          })),
          totalAmount: totalAmount,
          email: email,
          confirmationTime: new Date().toISOString(),
          orderType: 'regular' ,
        }
      });

    } catch (error) {
      console.error('Order failed:', error);
      Alert.alert('Error', error.message || 'Order processing failed');
      setCurrentOrderId(null);
    } finally {
      setProcessing(false);
      setSocketInitialized(false);
    }
  };

  const handleAddRegularItems = (newItems) => {
    const updatedOrder = newItems.filter(item => item.orderQuantity > 0);
    const total = updatedOrder.reduce((sum, item) => 
      sum + (item.price || 0) * (item.orderQuantity || 0), 0
    );
    setOrderDetails(updatedOrder);
    setTotalAmount(total);
    setShowRegularPopup(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Loading Order Details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          testID="backButton"
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <View style={styles.headerIcon}>
          <Icon name="fastfood" size={24} color="white" />
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.contentContainer}
        data={orderDetails}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Your Order</Text>}
        renderItem={({ item }) => (
          <View style={styles.itemCard} testID="orderItem">
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name || item.itemName}</Text>
              <View style={styles.regularBadge}>
                <Text style={styles.badgeText}>Regular</Text>
              </View>
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemPrice}>Rs.{(item.price || 0).toFixed(2)}</Text>
              <Text style={styles.itemQuantity}>× {item.orderQuantity || 0}</Text>
              <Text style={styles.itemTotal}>Rs.{((item.price || 0) * (item.orderQuantity || 0)).toFixed(2)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyOrderContainer}>
            <Icon name="fastfood" size={40} color="#8B0000" />
            <Text style={styles.emptyOrderText}>No items selected</Text>
          </View>
        }
        ListFooterComponent={
          <>
            <TouchableOpacity 
              style={styles.addMoreButton}
              onPress={() => setShowRegularPopup(true)}
              testID="editOrderButton"
            >
              <Icon 
                name={orderDetails.length > 0 ? "edit" : "add"} 
                size={20} 
                color="#8B0000" 
              />
              <Text style={styles.addMoreText}>
                {orderDetails.length > 0 ? "Edit Order" : "Add Items"}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>Rs.{totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.deliveryCard}>
              <Text style={styles.deliveryCardTitle}>Customer Information</Text>
              <View style={styles.deliveryInfoRow}>
                <View style={styles.deliveryIconContainer}>
                  <Icon name="person" size={20} color="#8B0000" />
                </View>
                <View style={styles.deliveryTextContainer}>
                  <Text style={styles.deliveryLabel}>Name</Text>
                  <Text style={styles.deliveryValue}>{userName || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.deliveryInfoRow}>
                <View style={styles.deliveryIconContainer}>
                  <Icon name="email" size={20} color="#8B0000" />
                </View>
                <View style={styles.deliveryTextContainer}>
                  <Text style={styles.deliveryLabel}>Email</Text>
                  <Text style={styles.deliveryValue}>{email}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.confirmButton, (processing || orderConfirmed) && styles.disabledButton]}
              onPress={handleConfirmOrder}
              disabled={processing || orderConfirmed}
              testID="confirmOrderButton"
            >
              {processing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {orderConfirmed ? 'ORDER CONFIRMED' : 'CONFIRM ORDER'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        }
      />

      <RegularOrderPopup
        visible={showRegularPopup}
        onClose={() => setShowRegularPopup(false)}
        onAddItems={handleAddRegularItems}
        currentOrder={orderDetails}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
  regularBadge: {
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
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
  }
});

export default ConfirmOrderScreen;