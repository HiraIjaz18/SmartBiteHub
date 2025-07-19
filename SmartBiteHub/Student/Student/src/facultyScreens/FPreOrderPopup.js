// FPreOrderPopup.js
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

const FPreOrderPopup = ({ 
  visible, 
  onClose, 
  currentOrder = [], 
  onAddItems
}) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [fetchingItems, setFetchingItems] = useState(true);
  const [error, setError] = useState(null);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    const fetchAndFilterItems = async () => {
      try {
        setFetchingItems(true);
        setError(null);
        
        const response = await fetch('http://172.21.12.246:4000/api/daily/menu-items');
        if (!response.ok) throw new Error('Failed to fetch menu items');
        
        const result = await response.json();
        const allItems = result.data || result.menuItems || [];
        
        // Corrected filter condition (availability instead of available)
        const specialItems = allItems.filter(item => 
          item.itemType?.toLowerCase() === 'special' && 
          item.availability === true
        );
    
        const existingItemNames = new Set(
          currentOrder.map(item => item.name.toLowerCase().trim())
        );
    
        const availableItems = specialItems.filter(item => 
          !existingItemNames.has(item.name.toLowerCase().trim())
        );
    
        setMenuItems(availableItems);
        
        const initialQuantities = {};
        availableItems.forEach(item => {
          initialQuantities[item._id] = 0;
        });
        setQuantities(initialQuantities);
    
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setFetchingItems(false);
      }
    };

    if (visible) fetchAndFilterItems();
  }, [visible, currentOrder]);

  // ... rest of the component remains the same ...

  const handleQuantityChange = (itemId, value) => {
    const parsedValue = parseInt(value) || 0;
    const numericValue = Math.min(Math.max(parsedValue, 0), 4);
    setQuantities(prev => ({
      ...prev,
      [itemId]: numericValue
    }));
  };

  const incrementQuantity = (itemId) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.min((prev[itemId] || 0) + 1, 4)
    }));
  };

  const decrementQuantity = (itemId) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max((prev[itemId] || 0) - 1, 0)
    }));
  };

  const renderItem = ({ item }) => {
    const quantity = quantities[item._id] || 0;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>Rs {item.price.toFixed(2)}</Text>
          {quantity >= 4 && (
            <Text style={styles.maxQuantityWarning}>Maximum 4 per order</Text>
          )}
        </View>
        
        <View style={styles.quantityControls}>
          <TouchableOpacity 
            style={styles.quantityButton} 
            onPress={() => decrementQuantity(item._id)}
            disabled={quantity <= 0}
          >
            <Icon name="remove" size={20} color={quantity <= 0 ? '#ccc' : '#8B0000'} />
          </TouchableOpacity>
          
          <TextInput
            style={[
              styles.quantityInput,
              quantity >= 4 && styles.quantityInputWarning
            ]}
            value={quantity.toString()}
            onChangeText={(text) => handleQuantityChange(item._id, text)}
            keyboardType="numeric"
            maxLength={1}
          />
          
          <TouchableOpacity 
            style={styles.quantityButton} 
            onPress={() => incrementQuantity(item._id)}
            disabled={quantity >= 4}
          >
            <Icon name="add" size={20} color={quantity >= 4 ? '#ccc' : '#8B0000'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleConfirm = () => {
    const newItems = menuItems
      .filter(item => quantities[item._id] > 0)
      .map(item => ({
        ...item,
        orderQuantity: quantities[item._id],
        isPreOrder: true,
        isNew: true
      }));

    if (newItems.length === 0) {
      Alert.alert('No Items Selected', 'Please add at least one special item to your pre-order');
      return;
    }

    onAddItems(newItems);
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={() => onClose()}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pre-Order Special Items (Max 4 each)</Text>
          <TouchableOpacity onPress={() => onClose()}>
            <Icon name="close" size={24} color="#8B0000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search special items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={40} color="#FF0000" />
            <Text style={styles.errorText}>Failed to load special items</Text>
            <Text style={styles.errorDetail}>{error}</Text>
          </View>
        ) : fetchingItems ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B0000" />
            <Text style={styles.loadingText}>Loading special items...</Text>
          </View>
        ) : (
          <FlatList
            data={menuItems.filter(item => 
              item.name.toLowerCase().includes(searchQuery.toLowerCase()))
            }
            renderItem={renderItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No items match your search' : 'No special items available'}
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Add to Pre-Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Styles remain unchanged from original
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
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#8B0000',
    fontWeight: '600',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
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
  maxQuantityWarning: {
    fontSize: 12,
    color: '#FF0000',
    marginTop: 4,
  },
  footer: {
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
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
});

export default FPreOrderPopup;