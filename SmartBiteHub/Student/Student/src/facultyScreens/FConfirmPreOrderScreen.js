import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  SafeAreaView,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import FPreOrderPopup from './FPreOrderPopup';

const FConfirmPreOrderScreen = ({ navigation }) => {
  const [state, setState] = useState({
    orderDetails: [],
    loading: true,
    confirming: false,
    totalAmount: 0,
    email: '',
    userName: '',
    wing: '',
    floor: '',
    roomNumber: '',
    remainingTime: 300,
    timerActive: false,
    showTimeModal: false,
    deliveryTime: null,
    deliveryTimeError: '',
    isOperatingHours: true,
    pickupDate: '',
    deliveryDate: '',
    showPreOrderPopup: false,
    showDatePicker: false,
    selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Default to tomorrow
    dateError: ''
  });

  const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

  // Generate time slots from 8:00 AM to 3:45 PM in 15-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8;
    const endHour = 15;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === endHour && minute > 45) continue;
        
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;
        const timeValue = `${hour}:${minute.toString().padStart(2, '0')}`;
        const timeDisplay = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        
        slots.push({
          value: timeValue,
          display: timeDisplay
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Format date to display like "Monday, January 1"
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format seconds to MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get tomorrow's date for delivery and pickup
  const getDates = (selectedDate) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return {
      deliveryDate: dateStr,
      pickupDate: dateStr
    };
  };

  // Handle date change from date picker
  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'set') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Ensure selected date is not in the past
      if (selectedDate < today) {
        updateState({ 
          dateError: 'Please select a future date',
          showDatePicker: false
        });
        return;
      }

      const dates = getDates(selectedDate);
      updateState({
        selectedDate,
        deliveryDate: dates.deliveryDate,
        pickupDate: dates.pickupDate,
        dateError: '',
        showDatePicker: false
      });
    } else {
      updateState({ showDatePicker: false });
    }
  };

  // Load order data from AsyncStorage
  const loadOrderData = async () => {
    try {
      const [storedOrderDetails, storedEmail] = await Promise.all([
        AsyncStorage.getItem('orderDetails'),
        AsyncStorage.getItem('email')
      ]);

      if (!storedOrderDetails || !storedEmail) {
        throw new Error('No order details or email found');
      }

      const parsedOrderDetails = JSON.parse(storedOrderDetails);
      const total = parsedOrderDetails.reduce((sum, item) => sum + item.price * item.orderQuantity, 0);
      
      const dates = getDates(state.selectedDate);
      
      updateState({
        orderDetails: parsedOrderDetails,
        email: storedEmail,
        totalAmount: total,
        deliveryDate: dates.deliveryDate,
        pickupDate: dates.pickupDate,
        loading: false
      });

      return storedEmail;
    } catch (error) {
      console.error('Error loading order data:', error);
      Alert.alert('Error', 'Could not load order details. Please try again.');
      navigation.goBack();
      return null;
    }
  };

  // Fetch faculty details from API
  const fetchFacultyDetails = async (email) => {
    if (!email) return;
    
    try {
      const response = await fetch(`http://172.21.12.246:4000/api/faculty/faculty/${email}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      if (!data.success) throw new Error('Failed to fetch faculty details');

      updateState({
        userName: data.faculty.name || '',
        wing: data.faculty.wing || '',
        floor: data.faculty.floor || '',
        roomNumber: data.faculty.roomNumber || '',
        loading: false
      });
    } catch (error) {
      console.error('Error fetching faculty details:', error);
      updateState({ loading: false });
      Alert.alert('Error', 'Could not fetch delivery information.');
    }
  };

  // Handle adding new items to pre-order
  const handleAddPreOrder = (newItems) => {
    const updatedOrder = [...state.orderDetails, ...newItems];
    const total = updatedOrder.reduce((sum, item) => sum + (item.price * item.orderQuantity), 0);
    
    updateState({
      orderDetails: updatedOrder,
      totalAmount: total,
      showPreOrderPopup: false
    });
  };

  // Initialize data when component mounts
  useEffect(() => {
    const initializeData = async () => {
      const email = await loadOrderData();
      if (email) await fetchFacultyDetails(email);
    };

    initializeData();
  }, []);

  // Handle countdown timer
  useEffect(() => {
    let timer;
    if (state.timerActive && state.remainingTime > 0) {
      timer = setInterval(() => {
        updateState({ remainingTime: state.remainingTime - 1 });
      }, 1000);
    } else if (state.remainingTime <= 0) {
      updateState({ timerActive: false });
      Alert.alert('Time Expired', 'The cancellation period has ended.');
    }

    return () => clearInterval(timer);
  }, [state.timerActive, state.remainingTime]);

  // Validate pre-order before submission
  const validatePreOrder = () => {
    const { orderDetails, deliveryTime, selectedDate } = state;
    const errors = [];
  
    if (orderDetails.some(item => item.itemType !== 'Special')) {
      errors.push('Pre-orders are only allowed for special items');
    }
  
    if (orderDetails.length === 0) {
      errors.push('Please select at least one special item.');
    }
  
    if (!deliveryTime) {
      updateState({ deliveryTimeError: 'Please select a delivery time' });
      errors.push('Delivery time is required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      updateState({ dateError: 'Please select a future date' });
      errors.push('Delivery date must be in the future');
    }
  
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return false;
    }
  
    return true;
  };

  // Handle order confirmation
  const handleConfirmOrder = async () => {
    if (!validatePreOrder()) return;
    updateState({ confirming: true });

    try {
      const orderData = {
        items: state.orderDetails.map(item => ({
          itemName: item.name,
          itemType: item.itemType || 'Special',
          quantity: item.orderQuantity,
          itemPrice: item.price,
        })),
        totalPrice: state.totalAmount,
        deliveryDate: state.deliveryDate,
        pickupDate: state.pickupDate,
        deliveryTime: state.deliveryTime.value,
        status: 'Pending',
        userId: state.email,
        userName: state.userName,
        wing: state.wing,
        floor: state.floor,
        roomNumber: state.roomNumber,
      };

      const response = await fetch('http://172.21.12.246:4000/api/Fpreorder/Fpreorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create pre-order');
      }

      const responseData = await response.json();
      if (!responseData.success) throw new Error('Order creation failed');

      await processSuccessfulOrder(responseData);
      
    } catch (error) {
      console.error('Pre-order confirmation error:', error);
      Alert.alert('Order Failed', error.message || 'Failed to confirm the pre-order. Please try again.');
    } finally {
      updateState({ confirming: false });
    }
  };

  // Process successful order (wallet deduction, menu update, etc.)
  const processSuccessfulOrder = async (responseData) => {
    try {
      // Deduct from wallet
      const walletResponse = await fetch('http://172.21.12.246:4000/api/Fwallets/Fwallet/deduct', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${responseData.token}`,
        },
        body: JSON.stringify({ 
          amount: state.totalAmount, 
          email: state.email 
        }),
      });

      if (!walletResponse.ok) {
        throw new Error('Failed to deduct wallet balance');
      }

      const walletData = await walletResponse.json();
      if (!walletData.success) {
        throw new Error('Wallet deduction failed');
      }

      // Update menu availability
      const updateMenuResponse = await fetch('http://172.21.12.246:4000/api/daily/update-availability', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${responseData.token}`,
        },
        body: JSON.stringify({
          items: state.orderDetails.map((item) => ({
            itemName: item.name,
            quantity: item.orderQuantity,
          })),
        }),
      });

      if (!updateMenuResponse.ok) {
        console.warn('Failed to update menu items availability');
      }

      // Clear storage and navigate to receipt
      await AsyncStorage.multiRemove(['orderDetails']);
      await AsyncStorage.setItem('orderConfirmationTime', new Date().toISOString());

      navigation.navigate('FpreOrderReceiptScreen', {
        orderDetails: {
          orderId: responseData.order._id,
          token: responseData.token,
          items: state.orderDetails.map(item => ({
            itemName: item.name,
            itemPrice: item.price,
            quantity: item.orderQuantity,
          })),
          totalAmount: state.totalAmount,
          deliveryDate: state.deliveryDate,
          pickupDate: state.pickupDate,
          deliveryTime: state.deliveryTime.display,
          email: state.email,
          userName: state.userName,
          wing: state.wing,
          floor: state.floor,
          roomNumber: state.roomNumber,
          isPreOrder: true
        },
      });

      // Start cancellation timer
      updateState({ timerActive: true });
    } catch (error) {
      console.error('Post-order processing error:', error);
      throw error;
    }
  };

  // Loading state
  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>
          Loading order details...
        </Text>
      </View>
    );
  }

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Pre-Order Summary
        </Text>
        <View style={styles.headerIcon}>
          <Icon name="restaurant" size={24} color="white" />
        </View>
      </View>

      {/* Main content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Timer */}
        <View style={styles.timerWrapper}>
          <View style={styles.timerContainer}>
            <Icon name="timer" size={20} color="#8B0000" />
            <Text style={styles.timerText}>
              {state.timerActive 
                ? `Time to cancel: ${formatTime(state.remainingTime)}` 
                : `Pre-order for ${formatDate(state.selectedDate)}`}
            </Text>
          </View>
        </View>

        {/* Order items */}
        <Text style={styles.sectionTitle}>
          Your Pre-Order
        </Text>

        {state.orderDetails.length === 0 ? (
          <View style={styles.emptyOrderContainer}>
            <Icon name="fastfood" size={40} color="#8B0000" />
            <Text style={styles.emptyOrderText}>No pre-order items selected</Text>
          </View>
        ) : (
          state.orderDetails.map((item, index) => (
            <View key={index.toString()} style={styles.itemCard}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemPrice}>
                  Rs {item.price.toFixed(2)}
                </Text>
                <Text style={styles.itemQuantity}>
                  × {item.orderQuantity}
                </Text>
                <Text style={styles.itemTotal}>
                  Rs {(item.price * item.orderQuantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Add/Edit button */}
        <TouchableOpacity 
          style={styles.addMoreButton}
          onPress={() => updateState({ showPreOrderPopup: true })}
        >
          <Icon name={state.orderDetails.length > 0 ? "edit" : "add"} size={20} color="#8B0000" />
          <Text style={styles.addMoreText}>
            {state.orderDetails.length > 0 ? "Change Pre-Order" : "Add Pre-Order Item"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Total amount */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>
            Total Amount:
          </Text>
          <Text style={styles.totalAmount}>
            Rs {state.totalAmount.toFixed(2)}
          </Text>
        </View>

        {/* Delivery information */}
        <View style={styles.deliveryCard}>
          <Text style={styles.deliveryCardTitle}>Delivery Information</Text>
          
          {/* Date selection */}
          <View style={styles.deliveryInfoRow}>
            <View style={styles.deliveryIconContainer}>
              <Icon name="calendar-today" size={20} color="#8B0000" />
            </View>
            <View style={styles.deliveryTextContainer}>
              <Text style={styles.deliveryLabel}>Delivery Date</Text>
              <TouchableOpacity onPress={() => updateState({ showDatePicker: true })}>
                <Text style={[styles.deliveryValue, styles.datePickerText]}>
                  {formatDate(state.selectedDate)}
                </Text>
              </TouchableOpacity>
              {state.dateError ? (
                <Text style={styles.errorText}>{state.dateError}</Text>
              ) : null}
            </View>
          </View>

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
          
          <View style={styles.deliveryInfoRow}>
            <View style={styles.deliveryIconContainer}>
              <Icon name="location-on" size={20} color="#8B0000" />
            </View>
            <View style={styles.deliveryTextContainer}>
              <Text style={styles.deliveryLabel}>Address</Text>
              <Text style={styles.deliveryValue}>
                {[state.wing && `${state.wing} Wing`, 
                state.floor && `Floor ${state.floor}`, 
                state.roomNumber && `Room ${state.roomNumber}`]
                .filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Time selection */}
        <TouchableOpacity 
          style={[
            styles.timeButton,
            state.deliveryTimeError ? styles.errorBorder : null
          ]}
          onPress={() => updateState({ showTimeModal: true })}
        >
          <Text style={styles.timeButtonText}>
            {state.deliveryTime ? state.deliveryTime.display : 'Select Time (8AM-3:45PM)'}
          </Text>
        </TouchableOpacity>
        
        {state.deliveryTimeError ? (
          <Text style={styles.errorText}>{state.deliveryTimeError}</Text>
        ) : null}

        {/* Confirm button */}
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

        {/* Timer alert */}
        {state.timerActive && (
          <View style={styles.timerAlertContainer}>
            <Icon name="warning" size={20} color="#8B0000" />
            <Text style={styles.timerAlertText}>
              You can cancel this order within {formatTime(state.remainingTime)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Date picker modal */}
      {state.showDatePicker && (
        <DateTimePicker
          value={state.selectedDate}
          mode="date"
          display="calendar"
          minimumDate={new Date(new Date().setDate(new Date().getDate() + 1))}
          onChange={handleDateChange}
        />
      )}

      {/* Time selection modal */}
      <Modal
        visible={state.showTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => updateState({ showTimeModal: false })}
      >
        <TouchableWithoutFeedback onPress={() => updateState({ showTimeModal: false })}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Delivery Time</Text>
          <Text style={styles.modalSubtitle}>Available between 8:00 AM - 3:45 PM</Text>
          
          <FlatList
            data={timeSlots}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.timeSlot,
                  state.deliveryTime?.value === item.value && styles.selectedTimeSlot
                ]}
                onPress={() => {
                  updateState({ 
                    deliveryTime: item,
                    showTimeModal: false,
                    deliveryTimeError: '' 
                  });
                }}
              >
                <Text style={styles.timeSlotText}>{item.display}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.timeSlotsContainer}
            style={styles.timeSlotsList}
          />
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => updateState({ showTimeModal: false })}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Pre-order popup */}
      <FPreOrderPopup
        visible={state.showPreOrderPopup}
        onClose={() => updateState({ showPreOrderPopup: false })}
        onAddItems={handleAddPreOrder}
        currentOrder={state.orderDetails}
      />
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
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
  datePickerText: {
    color: '#8B0000',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  timeButton: {
    backgroundColor: '#FFE4E1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  errorBorder: {
    borderColor: 'red',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#8B0000',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 'auto',
    marginBottom: 20,
    borderRadius: 10,
    maxHeight: '70%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#8B0000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  timeSlotsContainer: {
    paddingBottom: 20,
  },
  timeSlotsList: {
    maxHeight: 300,
  },
  timeSlot: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedTimeSlot: {
    backgroundColor: '#FFE4E1',
  },
  timeSlotText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: 'bold',
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

export default FConfirmPreOrderScreen;