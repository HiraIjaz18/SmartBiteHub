import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const FOrderPopup = ({ 
  visible, 
  onClose, 
  initialOrderDetails = [], 
  totalAmount, 
  deliveryInfo,
  email,
  isOperatingHours
}) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderDetails, setOrderDetails] = useState(initialOrderDetails);
  const [menuItems, setMenuItems] = useState([]);
  const [fetchingItems, setFetchingItems] = useState(true);
  const [error, setError] = useState(null);

  // Fetch regular menu items when popup opens
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setFetchingItems(true);
        setError(null);
        
        const response = await fetch('http://172.21.12.246:4000/api/daily/menu-items');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const result = await response.json();
        
        // DEBUG: Log initial order details structure
        console.log('Initial order details:', JSON.stringify(initialOrderDetails, null, 2));
        
        // Get names of items already in any order (main or pre-order)
        const existingOrderNames = new Set(
          initialOrderDetails
            .map(item => item?.name?.toLowerCase())
            .filter(Boolean)
        );
  
        console.log('Existing order item names:', Array.from(existingOrderNames));
  
        // Process all menu items
        const allItems = Array.isArray(result) ? result : (result.data || result.menuItems || []);
        
        // Filter for available regular items not in any existing order
        const availableRegularItems = allItems.filter(item => {
          // Basic validation
          if (!item?.name || !item?.price) return false;
          
          // Must be regular type and available
          if (item.itemType !== 'Regular' || item.available === false) return false;
          
          // Must not have same name as any item in existing orders
          return !existingOrderNames.has(item.name.toLowerCase());
        });
  
        console.log('Available regular items:', availableRegularItems.map(i => i.name));
  
        setMenuItems(availableRegularItems);
        
        // Initialize order details while preserving existing items
        setOrderDetails(prev => {
          const newDetails = [...initialOrderDetails];
          // Add any new items with quantity 0
          availableRegularItems.forEach(item => {
            if (!newDetails.some(existing => existing.name?.toLowerCase() === item.name.toLowerCase())) {
              newDetails.push({
                ...item,
                orderQuantity: 0,
                isOrder: true
              });
            }
          });
          return newDetails;
        });
      } catch (err) {
        console.error('Failed to fetch menu items:', err);
        setError(err.message);
        setMenuItems([]);
      } finally {
        setFetchingItems(false);
      }
    };
  
    if (visible) {
      fetchMenuItems();
    }
  }, [visible, initialOrderDetails]);

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuantityChange = (itemId, value) => {
    let numValue = parseInt(value) || 0;
    // Enforce reasonable maximum (higher than pre-order since these are regular items)
    numValue = Math.min(numValue, 10);
    
    // Update or add the item to order details
    setOrderDetails(prev => {
      const existingItemIndex = prev.findIndex(item => item._id === itemId);
      
      if (existingItemIndex >= 0) {
        if (numValue <= 0) {
          // Remove item if quantity is 0
          return prev.filter(item => item._id !== itemId);
        } else {
          // Update quantity
          const updated = [...prev];
          updated[existingItemIndex] = {
            ...updated[existingItemIndex],
            orderQuantity: numValue
          };
          return updated;
        }
      } else if (numValue > 0) {
        // Add new item
        const newItem = menuItems.find(item => item._id === itemId);
        if (newItem) {
          return [...prev, {
            ...newItem,
            orderQuantity: numValue,
            isOrder: true, // Explicitly mark as non-pre-order
          }];
        }
      }
      
      return prev;
    });
  };

  const incrementQuantity = (itemId) => {
    const currentQty = orderDetails.find(item => item._id === itemId)?.orderQuantity || 0;
    const newQty = Math.min(currentQty + 1, 10);
    handleQuantityChange(itemId, newQty.toString());
  };

  const decrementQuantity = (itemId) => {
    const currentQty = orderDetails.find(item => item._id === itemId)?.orderQuantity || 0;
    handleQuantityChange(itemId, (currentQty - 1).toString());
  };

  const calculateTotal = () => {
    return orderDetails.reduce((sum, item) => sum + item.price * item.orderQuantity, 0);
  };

  const handleConfirm = () => {
    if (!isOperatingHours) {
      Alert.alert('Ordering Closed', 'Orders can only be placed between 8:15 AM and 3:45 PM');
      return;
    }

    if (orderDetails.length === 0) {
      Alert.alert('No Items Selected', 'Please add at least one item to your order');
      return;
    }

    setLoading(true);
    onClose(true, orderDetails);
  };

  const renderItem = ({ item }) => {
    const orderItem = orderDetails.find(order => order._id === item._id);
    const quantity = orderItem?.orderQuantity || 0;

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>Rs {item.price.toFixed(2)}</Text>
          {quantity >= 10 && (
            <Text style={styles.maxQuantityWarning}>Maximum 10 per order</Text>
          )}
        </View>
        
        <View style={styles.quantityControls}>
          <TouchableOpacity 
            style={styles.quantityButton} 
            onPress={() => decrementQuantity(item._id)}
            disabled={quantity <= 0}
          >
            <Icon 
              name="remove" 
              size={20} 
              color={quantity <= 0 ? '#ccc' : '#8B0000'} 
            />
          </TouchableOpacity>
          
          <TextInput
            style={[
              styles.quantityInput,
              quantity >= 10 && styles.quantityInputWarning
            ]}
            value={quantity.toString()}
            onChangeText={(text) => handleQuantityChange(item._id, text)}
            keyboardType="numeric"
          />
          
          <TouchableOpacity 
            style={styles.quantityButton} 
            onPress={() => incrementQuantity(item._id)}
            disabled={quantity >= 10}
          >
            <Icon 
              name="add" 
              size={20} 
              color={quantity >= 10 ? '#ccc' : '#8B0000'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Build Your Order</Text>
          <TouchableOpacity onPress={() => onClose(false)}>
            <Icon name="close" size={24} color="#8B0000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search regular items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={40} color="#FF0000" />
            <Text style={styles.errorText}>Failed to load menu items</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => setError(null)}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : fetchingItems ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B0000" />
            <Text style={styles.loadingText}>Loading menu items...</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No items match your search' : 'No regular items available to add'}
                  </Text>
                </View>
              }
            />

            
          </>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!isOperatingHours || loading || orderDetails.length === 0) && styles.disabledButton
            ]}
            onPress={handleConfirm}
            disabled={!isOperatingHours || loading || orderDetails.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {isOperatingHours ? 'Confirm Order' : 'Ordering Closed'}
                </Text>
                <Text style={styles.buttonSubtext}>Rs {calculateTotal().toFixed(2)}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    margin: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: '#8B0000',
    fontWeight: '600',
  },
  maxQuantityWarning: {
    fontSize: 12,
    color: '#FF0000',
    fontStyle: 'italic',
    marginTop: 3,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 50,
    height: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  quantityInputWarning: {
    borderColor: '#FF0000',
    backgroundColor: '#fff0f0',
  },
  summarySection: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B0000',
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItemName: {
    fontSize: 14,
    color: '#333',
  },
  summaryItemDetails: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '500',
  },
  noItemsText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    paddingVertical: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#228B22',
  },
  deliveryInfo: {
    padding: 15,
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B0000',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  confirmButton: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: '#FFF',
    fontSize: 13,
    opacity: 0.9,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8B0000',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 18,
    marginTop: 10,
  },
  errorDetail: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#8B0000',
    borderRadius: 5,
  },
  retryText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default FOrderPopup;