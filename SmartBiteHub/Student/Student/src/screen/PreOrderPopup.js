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

const PreOrderPopup = ({ 
  visible, 
  onClose, 
  currentOrder = [], 
  onAddItems
}) => {
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [fetchingItems, setFetchingItems] = useState(true);
  const [error, setError] = useState(null);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    const fetchAndFilterItems = async () => {
      try {
        setFetchingItems(true);
        setError(null);
        
        console.log('Fetching menu items...');
        const response = await fetch('http://172.21.12.17:4000/api/daily/menu-items');
        
        if (!response.ok) {
          console.error('Server response not OK:', response.status);
          throw new Error(`Server returned ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (!result) {
          console.error('No data received from API');
          throw new Error('No data received');
        }

        // Handle both possible response formats
        const allItems = Array.isArray(result) 
          ? result 
          : result.data || result.menuItems || [];
        console.log('All items:', allItems);

        // Filter special and available items
        const specialItems = allItems.filter(item => {
          const isSpecial = item?.itemType?.toLowerCase() === 'special';
          const isAvailable = item?.availability === true || item?.available === true;
          console.log(`Item ${item?.name}: special=${isSpecial}, available=${isAvailable}`);
          return item && isSpecial && isAvailable;
        });
        console.log('Special items:', specialItems);

        // Get names of items already in current order (case insensitive)
        const existingItemNames = new Set(
          currentOrder
            .filter(item => item?.itemName) // Changed from item.name to item.itemName
            .map(item => item.itemName.toLowerCase().trim()) // Changed from item.name
        );
        console.log('Existing pre-order item names:', Array.from(existingItemNames));
        
        // Filter out items already in current order
        const availableItems = specialItems.filter(item => {
          const itemName = item.name?.toLowerCase()?.trim();
          const notInOrder = !existingItemNames.has(itemName);
          console.log(`Item ${item.name}: exists? ${!notInOrder}`);
          return item?.name && notInOrder;
        });
        console.log('Final available items:', availableItems);
        
        // Initialize quantities
        const initialQuantities = {};
        availableItems.forEach(item => {
          if (item?._id) {
            initialQuantities[item._id] = 0;
          }
        });
        setQuantities(initialQuantities);
        console.log('Initialized quantities:', initialQuantities);
    
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'An unknown error occurred');
      } finally {
        setFetchingItems(false);
      }
    };

    if (visible) {
      console.log('Popup visible, fetching items...');
      fetchAndFilterItems();
    } else {
      console.log('Popup not visible, skipping fetch');
    }
  }, [visible, currentOrder]);

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
    if (!item || !item._id) return null;
    
    const quantity = quantities[item._id] || 0;
    const itemName = item.name || 'Unnamed Item';
    const itemPrice = item.price ? item.price.toFixed(2) : '0.00';

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{itemName}</Text>
          <Text style={styles.itemPrice}>Rs {itemPrice}</Text>
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
      .filter(item => item && item._id && quantities[item._id] > 0)
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
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={() => onClose()}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity onPress={() => onClose()}>
          <Icon name="close" size={24} color="#8B0000" />
        </TouchableOpacity>

        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={40} color="#FF0000" />
            <Text style={styles.errorText}>Failed to load special items</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => setError(null)}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : fetchingItems ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B0000" />
            <Text style={styles.loadingText}>Loading special items...</Text>
          </View>
        ) : (
          <FlatList
            data={menuItems}  // Display all menu items
            renderItem={renderItem}
            keyExtractor={item => item._id || Math.random().toString()}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No special items available
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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  listContainer: {
    paddingBottom: 60,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
  },
  itemInfo: {
    flex: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
},
itemPrice: {
fontSize: 14,
color: '#888',
},
maxQuantityWarning: {
color: '#FF0000',
fontSize: 12,
marginTop: 5,
},
quantityControls: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
},
quantityButton: {
padding: 5,
},
quantityInput: {
width: 40,
height: 40,
borderWidth: 1,
borderColor: '#ddd',
textAlign: 'center',
fontSize: 16,
},
quantityInputWarning: {
borderColor: '#FF0000',
},
errorContainer: {
alignItems: 'center',
marginTop: 50,
},
errorText: {
fontSize: 18,
fontWeight: 'bold',
color: '#FF0000',
},
errorDetail: {
fontSize: 14,
color: '#888',
},
retryButton: {
backgroundColor: '#8B0000',
padding: 10,
borderRadius: 5,
marginTop: 10,
},
retryButtonText: {
color: '#fff',
fontSize: 16,
},
loadingContainer: {
alignItems: 'center',
justifyContent: 'center',
flex: 1,
},
loadingText: {
fontSize: 18,
color: '#8B0000',
marginTop: 10,
},
footer: {
paddingVertical: 20,
alignItems: 'center',
},
confirmButton: {
backgroundColor: '#8B0000',
padding: 15,
borderRadius: 5,
width: '100%',
alignItems: 'center',
},
buttonText: {
color: '#fff',
fontSize: 18,
},
emptyContainer: {
alignItems: 'center',
marginTop: 50,
},
emptyText: {
fontSize: 18,
color: '#888',
},
});

export default PreOrderPopup;

