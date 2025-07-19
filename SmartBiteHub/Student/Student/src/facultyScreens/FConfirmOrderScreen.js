import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  FlatList, 
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Timer from './Timer';
import FOrderPopup from './FOrderPopup';

const { height } = Dimensions.get('window');
const isSmallScreen = height < 600;

const FConfirmOrderScreen = ({ navigation }) => {
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [email, setEmail] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: '',
    wing: '',
    floor: '',
    roomNumber: ''
  });
  const [isOperatingHours, setIsOperatingHours] = useState(true);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [allMenuItems, setAllMenuItems] = useState([]);

  const loadOrderData = async () => {
    try {
      const [storedOrderDetails, storedEmail, menuItems] = await Promise.all([
        AsyncStorage.getItem('orderDetails'),
        AsyncStorage.getItem('email'),
        fetchMenuItems()
      ]);

      if (!storedOrderDetails || !storedEmail) {
        throw new Error('No order details or email found');
      }

      const parsedOrderDetails = JSON.parse(storedOrderDetails);
      setOrderDetails(parsedOrderDetails);
      setEmail(storedEmail);
      updateTotalAmount(parsedOrderDetails);
      return storedEmail;
    } catch (error) {
      console.error('Error loading order data:', error);
      Alert.alert('Error', 'Could not load order details. Please try again.');
      navigation.goBack();
      throw error;
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('http://172.21.12.246:4000/api/daily/menu-items');
      const data = await response.json();
      
      if (data?.success) {
        const items = data.data.map(item => ({
          ...item,
          orderQuantity: 0
        }));
        setAllMenuItems(items);
        return items;
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      return [];
    }
  };

  const updateTotalAmount = (items) => {
    const total = items.reduce((sum, item) => sum + item.price * item.orderQuantity, 0);
    setTotalAmount(total);
  };

  const fetchFacultyDetails = async (email) => {
    try {
      const response = await fetch(`http://172.21.12.246:4000/api/faculty/faculty/${email}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error('Failed to fetch faculty details');
      }

      const facultyData = data.faculty || data;
      setDeliveryInfo({
        name: facultyData.name || facultyData.userName || 'Not Available',
        wing: facultyData.wing || 'Not Available',
        floor: facultyData.floor || 'Not Available',
        roomNumber: facultyData.roomNumber || 'Not Available',
      });
    } catch (error) {
      console.error('Error fetching faculty details:', error);
      Alert.alert('Error', 'Could not fetch delivery information.');
    }
  };

  const handleAddItems = (confirmed, newOrderDetails) => {
    setShowAddItemsModal(false);
    if (confirmed) {
      // Merge new items with existing order
      const mergedOrderDetails = [...orderDetails];
      
      newOrderDetails.forEach(newItem => {
        const existingItemIndex = mergedOrderDetails.findIndex(
          item => item.name === newItem.name
        );
        
        if (existingItemIndex >= 0) {
          // Update quantity if item already exists
          mergedOrderDetails[existingItemIndex].orderQuantity += newItem.orderQuantity;
        } else {
          // Add new item if it doesn't exist
          mergedOrderDetails.push(newItem);
        }
      });

      setOrderDetails(mergedOrderDetails);
      updateTotalAmount(mergedOrderDetails);
      AsyncStorage.setItem('orderDetails', JSON.stringify(mergedOrderDetails));
    }
  };

  const handleConfirmOrder = async () => {
    if (!isOperatingHours) {
      Alert.alert('Ordering Closed', 'Orders can only be placed between 8:15 AM and 3:45 PM');
      return;
    }

    if (orderDetails.length === 0) {
      Alert.alert('Error', 'Please add at least one item to your order.');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email is missing. Please try again.');
      return;
    }

    setConfirming(true);

    try {
      const orderData = {
        items: orderDetails.map((item) => ({
          itemName: item.name,
          itemType: item.itemType || 'Regular',
          quantity: item.orderQuantity,
          itemPrice: item.price,
        })),
        totalPrice: totalAmount,
        orderDate: new Date().toISOString().split('T')[0],
        status: 'Pending',
        wing: deliveryInfo.wing,
        floor: deliveryInfo.floor,
        roomNumber: deliveryInfo.roomNumber,
        email,
        userName: deliveryInfo.name,
      };

      const orderResponse = await fetch('http://172.21.12.246:4000/api/Forders/Forder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(errorText || 'Failed to create pre-order');
      }

      const orderResponseData = await orderResponse.json();
      if (!orderResponseData.success) throw new Error('Order creation failed');

      await processSuccessfulOrder(orderResponseData);
    } catch (error) {
      console.error('Pre-order confirmation error:', error);
      Alert.alert('Order Failed', error.message || 'Failed to confirm the pre-order. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const processSuccessfulOrder = async (responseData) => {
    try {
      const walletResponse = await fetch('http://172.21.12.246:4000/api/Fwallets/Fwallet/deduct', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${responseData.token}`,
        },
        body: JSON.stringify({ 
          amount: totalAmount,
          email: email,
        }),
      });

      if (!walletResponse.ok) {
        throw new Error('Failed to deduct wallet balance');
      }

      const walletData = await walletResponse.json();
      if (!walletData.success) {
        throw new Error('Wallet deduction failed');
      }

      const updateMenuResponse = await fetch('http://172.21.12.246:4000/api/daily/update-availability', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${responseData.token}`,
        },
        body: JSON.stringify({
          items: orderDetails.map((item) => ({
            itemName: item.name,
            quantity: item.orderQuantity,
          })),
        }),
      });

      await AsyncStorage.multiSet([
        ['orderConfirmationTime', new Date().toISOString()],
        ['currentOrderId', responseData.order._id],
      ]);

      navigation.navigate('FOrderReceiptScreen', {
        orderDetails: {
          orderId: responseData.order._id,
          token: responseData.token,
          items: orderDetails,
          totalAmount,
          email,
          userName: deliveryInfo.name,
          wing: deliveryInfo.wing,
          floor: deliveryInfo.floor,
          roomNumber: deliveryInfo.roomNumber,
          isOrder: true,
        },
      });

      await AsyncStorage.multiRemove(['orderDetails']);
    } catch (error) {
      console.error('Order confirmation error:', error);
      Alert.alert(
        'Order Failed', 
        error.message || 'Failed to confirm the order. Please try again.'
      );
    }
  };

  const handleReturn = () => {
    navigation.goBack();
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        const userEmail = await loadOrderData();
        await fetchFacultyDetails(userEmail);
        setLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setLoading(false);
      }
    };

    initializeData();

    const handleAppStateChange = async (nextState) => {
      if (nextState === 'active') {
        const confirmationTime = await AsyncStorage.getItem('orderConfirmationTime');
        if (confirmationTime) {
          const elapsed = Math.floor((Date.now() - new Date(confirmationTime)) / 1000);
          if (elapsed > 300) {
            await AsyncStorage.multiRemove(['orderConfirmationTime', 'currentOrderId']);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Loading your order...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleReturn} style={styles.backButton}>
          <Icon name="arrow-back" size={isSmallScreen ? 18 : 20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <Icon name="restaurant" size={isSmallScreen ? 18 : 20} color="#FFF" />
      </View>

      <View style={styles.container}>
        <FlatList
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={
            <>
              <View style={styles.timerWrapper}>
                <Timer 
                  onTimerEnd={() => console.log('Window ended')}
                  onOperatingHoursChange={setIsOperatingHours}
                />
              </View>
              <Text style={styles.sectionTitle}>Your Order</Text>
            </>
          }
          data={orderDetails}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemPrice}>Rs {item.price.toFixed(2)}</Text>
                <Text style={styles.itemQuantity}>× {item.orderQuantity}</Text>
                <Text style={styles.itemTotal}>Rs {(item.price * item.orderQuantity).toFixed(2)}</Text>
              </View>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          ListEmptyComponent={
            <View style={styles.emptyOrderContainer}>
              <Icon name="fastfood" size={40} color="#8B0000" />
              <Text style={styles.emptyOrderText}>Your order is empty</Text>
              <Text style={styles.emptyOrderSubtext}>Add items to continue</Text>
            </View>
          }
          ListFooterComponent={
            <>
              <TouchableOpacity 
                style={styles.addMoreButton}
                onPress={() => setShowAddItemsModal(true)}
              >
                <Icon name={orderDetails.length > 0 ? "edit" : "add"} size={20} color="#8B0000" />
                <Text style={styles.addMoreText}>
                  {orderDetails.length > 0 ? "Change Order" : "Add Items"}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalAmount}>Rs {totalAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.deliveryCard}>
                <Text style={styles.deliveryCardTitle}>Delivery Information</Text>
                
                <View style={styles.deliveryInfoRow}>
                  <View style={styles.deliveryIconContainer}>
                    <Icon name="person" size={20} color="#8B0000" />
                  </View>
                  <View style={styles.deliveryTextContainer}>
                    <Text style={styles.deliveryLabel}>Name</Text>
                    <Text style={styles.deliveryValue}>{deliveryInfo.name || 'N/A'}</Text>
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
                
                <View style={styles.deliveryInfoRow}>
                  <View style={styles.deliveryIconContainer}>
                    <Icon name="location-on" size={20} color="#8B0000" />
                  </View>
                  <View style={styles.deliveryTextContainer}>
                    <Text style={styles.deliveryLabel}>Address</Text>
                    <Text style={styles.deliveryValue}>
                      {[
                        deliveryInfo.wing && `${deliveryInfo.wing} Wing`,
                        deliveryInfo.floor && `Floor ${deliveryInfo.floor}`,
                        deliveryInfo.roomNumber && `Room ${deliveryInfo.roomNumber}`
                      ].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.confirmButton,
                  (!isOperatingHours || orderDetails.length === 0) && styles.disabledButton
                ]}
                onPress={handleConfirmOrder}
                disabled={!isOperatingHours || orderDetails.length === 0 || confirming}
              >
                {confirming ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {isOperatingHours ? 'CONFIRM ORDER' : 'ORDERING CLOSED'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          }
        />

        <FOrderPopup
          visible={showAddItemsModal}
          onClose={handleAddItems}
          initialOrderDetails={orderDetails}
          allMenuItems={allMenuItems}
          totalAmount={totalAmount}
          deliveryInfo={deliveryInfo}
          email={email}
          isOperatingHours={isOperatingHours}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
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
    paddingVertical: isSmallScreen ? 8 : 10,
    paddingHorizontal: 15,
    backgroundColor: '#8B0000',
    elevation: 2,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  timerWrapper: {
    paddingHorizontal: 16,
    marginTop: 8,
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
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
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
  emptyOrderSubtext: {
    fontSize: 14,
    color: '#757575',
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
});

export default FConfirmOrderScreen;