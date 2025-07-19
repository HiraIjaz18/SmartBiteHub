import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import socketService from '../services/socket';

const FMainMenuScreen = ({ navigation }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Regular');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [email, setEmail] = useState('');
  const [checkoutAttempted, setCheckoutAttempted] = useState(false);

  const fetchData = async () => {
    try {
      const userEmail = await AsyncStorage.getItem('email');
      if (!userEmail) {
        Alert.alert('Error', 'Email not found. Please log in again.');
        return;
      }
      setEmail(userEmail);
  
      // Fetch menu items
      const menuResponse = await fetch('http://172.21.12.246:4000/api/daily/menu-items');
      const menuData = await menuResponse.json();
  
      if (menuData?.success) {
        const items = menuData.data.map((item, index) => ({
          ...item,
          orderQuantity: 0,
          uniqueKey: `${index}-${item.name}`,
        }));                      
        setMenuItems(items);
        setFilteredItems(items.filter((item) => item.itemType === 'Regular'));
      }
  
      const walletResponse = await fetch(
        `http://172.21.12.246:4000/api/Fwallets/Fbalance?email=${userEmail}`
      );
      const walletData = await walletResponse.json();
  
      if (walletData?.success) {
        setWalletBalance(walletData.balance);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const handleQuantityChange = (uniqueKey, increment) => {
    setFilteredItems((prevItems) =>
      prevItems.map((item) =>
        item.uniqueKey === uniqueKey
          ? {
              ...item,
              orderQuantity: Math.max(0, Math.min(item.quantity, item.orderQuantity + increment)),
            }
          : item
      )
    );

    setMenuItems((prevItems) =>
      prevItems.map((item) =>
        item.uniqueKey === uniqueKey
          ? {
              ...item,
              orderQuantity: Math.max(0, Math.min(item.quantity, item.orderQuantity + increment)),
            }
          : item
      )
    );
  };

  const handleOrder = async () => {
    setCheckoutAttempted(true);
    const selectedItems = filteredItems.filter((item) => item.orderQuantity > 0);
  
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to order.');
      return;
    }
  
    // Pre-Order Validation
    if (filter === 'Special') {
      const hasNonSpecialItem = selectedItems.some((item) => item.itemType !== 'Special');
      if (hasNonSpecialItem) {
        Alert.alert('Error', 'Pre-orders are only allowed for special items.');
        return;
      }
    }
  
    // Bulk Order Validation
    if (filter === 'Bulk') {
      const hasInsufficientQuantity = selectedItems.some((item) => item.orderQuantity < 5);
      if (hasInsufficientQuantity) {
        Alert.alert('Error', 'Bulk orders require a minimum of 5 quantities per item.');
        return;
      }
    }
  
    // Wallet Balance Check
    const totalCost = selectedItems.reduce((sum, item) => sum + item.price * item.orderQuantity, 0);
    if (totalCost > walletBalance) {
      Alert.alert('Error', 'Insufficient wallet balance to place this order.');
      return;
    }
  
    // Item Availability Check
    const hasUnavailableItems = selectedItems.some((item) => item.orderQuantity > item.quantity);
    if (hasUnavailableItems) {
      Alert.alert('Error', 'Ordered quantity exceeds available stock for one or more items.');
      return;
    }
  
    try {
      const orderDetails = selectedItems.map((item) => ({
        name: item.name,
        price: item.price,
        orderQuantity: item.orderQuantity,
        itemType: item.itemType,
        totalPrice: (item.price * item.orderQuantity).toFixed(2),
        isPreOrder: filter === 'Special',
        isBulkOrder: filter === 'Bulk',
      }));
  
      await AsyncStorage.setItem('orderDetails', JSON.stringify(orderDetails));
  
      if (filter === 'Bulk') {
        navigation.navigate('FConfirmBulkOrderScreen');
      } else if (filter === 'Special') {
        navigation.navigate('FConfirmPreOrderScreen');
      } else {
        navigation.navigate('FConfirmOrderScreen');
      }
    } catch (error) {
      console.error('Error storing order details:', error);
      Alert.alert('Error', 'Failed to process the order.');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    const filtered = menuItems.filter((item) =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleFilterChange = (type) => {
    setFilter(type);
    if (type === 'Regular') {
      setFilteredItems(menuItems.filter((item) => item.itemType === 'Regular'));
    } else if (type === 'Special') {
      setFilteredItems(menuItems.filter((item) => item.itemType === 'Special'));
    } else if (type === 'Bulk') {
      setFilteredItems(menuItems);
    }
  };

  const profileOptions = [
    { name: 'Sign Out', icon: 'signout', action: () => navigation.navigate('RoleSelectionScreen') },
    { name: 'Order Feedback', icon: 'feedback', action: () => navigation.navigate('FeedbackScreen') },
    { name: 'Close', icon: 'close', action: () => setShowProfileDropdown(false) },
  ];

  const selectedItems = filteredItems.filter((item) => item.orderQuantity > 0);
  const isButtonDisabled = selectedItems.length === 0;

  const getButtonText = () => {
    if (isButtonDisabled) {
      return checkoutAttempted ? 'Please select items' : 'Select Items to Checkout';
    }
    switch (filter) {
      case 'Bulk':
        return 'Proceed to Bulk Order';
      case 'Special':
        return 'Proceed to Pre-Order';
      default:
        return 'Proceed to Checkout';
    }
  };

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        if (!socketService.socket) {
          await socketService.connect();
        }
        
        socketService.socket?.on('connect', () => {
          setIsSocketConnected(true);
        });
  
        socketService.socket?.on('disconnect', () => {
          setIsSocketConnected(false);
        });
  
      } catch (error) {
        console.error('Socket connection error:', error);
      }
    };
  
    initializeSocket();
  
    return () => {
      socketService.socket?.off('connect');
      socketService.socket?.off('disconnect');
    };
  }, []);
  
  useEffect(() => {
    const handleOrderUpdate = (data) => {
      if (data.email === email) {
        setWalletBalance(prev => {
          const updatedBalance = prev - data.orderTotal;
          return Number(updatedBalance.toFixed(2));
        });
        
        const verifyBalance = async () => {
          try {
            const response = await fetch(`http://172.21.12.246:4000/api/Fwallets/Fbalance?email=${email}`);
            const { balance } = await response.json();
            setWalletBalance(Number(balance.toFixed(2)));
          } catch (error) {
            console.error('Balance verification failed:', error);
          }
        };
        
        verifyBalance();
        Alert.alert('Order Updated', `Your order was ${data.status}`);
      }
    };
  }, [email]);

  return (
    <View style={styles.mainContainer}>
      {/* Profile Icon at Top Right */}
      <TouchableOpacity 
        style={styles.profileIconContainer}
        onPress={() => setShowProfileDropdown(!showProfileDropdown)}
      >
        <Icon name="account-circle" size={40} color="#B24D32" />
      </TouchableOpacity>

      {/* Profile Dropdown Modal */}
      <Modal
        transparent={true}
        visible={showProfileDropdown}
        onRequestClose={() => setShowProfileDropdown(false)}
      >
        <Pressable 
          style={styles.dropdownOverlay}
          onPress={() => setShowProfileDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            {profileOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dropdownItem}
                onPress={() => {
                  option.action();
                  setShowProfileDropdown(false);
                }}
              >
                <Icon name={option.icon} size={24} color="#B24D32" />
                <Text style={styles.dropdownItemText}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Main content with ScrollView */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <Text style={styles.walletText}>Wallet Balance</Text>
          <Text style={styles.walletAmount}>Rs.{walletBalance.toFixed(2)}</Text>
        </View>

        {/* Feedback Header */}
        <View style={styles.feedbackHeaderContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('FeedbackScreen')}>
            <Text style={styles.feedbackHeader}>We Value Your Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.searchBar}
          placeholder="Search menu items..."
          value={searchQuery}
          onChangeText={handleSearch}
        />

        {/* Filter Buttons */}
        <View style={styles.filterButtons}>
          {['Regular', 'Special', 'Bulk'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                filter === type && styles.selectedFilterButton,
              ]}
              onPress={() => handleFilterChange(type)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === type && styles.selectedFilterButtonText
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>Menu</Text>
        {filteredItems.length === 0 ? (
          <Text style={styles.emptyMessage}>No menu items available.</Text>
        ) : (
          filteredItems.map((item) => (
            <View key={item.uniqueKey} style={styles.card}>
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
              <View style={styles.cardContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <Text style={styles.itemPrice}>Rs {item.price.toFixed(2)}</Text>
                </View>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <View style={styles.itemInfoRow}>
                  <Text style={styles.itemType}>
                    {item.itemType === 'Special' ? '🌟 Special' : 'Regular'}
                  </Text>
                  <Text style={styles.availableQuantity}>
                    Available: {item.quantity}
                  </Text>
                </View>
                {/* Quantity and Add to Order */}
                <View style={styles.quantityContainer}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(item.uniqueKey, -1)}
                  >
                    <Icon name="remove" size={20} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.orderQuantity}</Text>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(item.uniqueKey, 1)}
                  >
                    <Icon name="add" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Checkout Button and Error Message */}
      <View style={styles.checkoutButtonContainer}>
        {checkoutAttempted && isButtonDisabled && (
          <Text style={styles.errorText}>Please select at least one item to checkout</Text>
        )}
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            isButtonDisabled && styles.checkoutButtonDisabled
          ]}
          onPress={handleOrder}
          disabled={isButtonDisabled}
        >
          <Text style={[
            styles.checkoutButtonText,
            isButtonDisabled && styles.checkoutButtonTextDisabled
          ]}>
            {getButtonText()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  profileIconContainer: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 200,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  walletCard: {
    backgroundColor: '#8B0000',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  walletText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  walletAmount: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  feedbackHeaderContainer: {
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  feedbackHeader: {
    fontSize: 16,
    color: '#8B0000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchBar: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  selectedFilterButton: {
    backgroundColor: '#8B0000',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  selectedFilterButtonText: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 15,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
    marginLeft: 10,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  itemInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  itemType: {
    fontSize: 14,
    color: '#8B0000',
    fontWeight: '500',
  },
  availableQuantity: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 8,
  },
  quantityButton: {
    backgroundColor: '#8B0000',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
  },
  checkoutButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  checkoutButton: {
    backgroundColor: '#8B0000',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutButtonTextDisabled: {
    color: '#888',
  },
  errorText: {
    color: '#8B0000',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 30,
    marginBottom: 20,
  },
});

export default FMainMenuScreen;