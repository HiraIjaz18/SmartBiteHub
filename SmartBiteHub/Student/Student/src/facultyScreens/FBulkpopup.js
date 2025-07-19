import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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

const FBulkOrderPopup = memo(({ visible, onClose, onComplete, initialItems = [] }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isProcessing, setIsProcessing] = useState(false);

  const categories = useMemo(() => ['All', 'Regular', 'Special'], []);

  const fetchMenuItems = useCallback(async () => {
    let isMounted = true;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://172.21.12.246:4000/api/daily/menu-items');
      
      if (!isMounted) return;
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
  
      const result = await response.json();
      
      const items = Array.isArray(result) ? result : (result.data || result.menuItems || []);
      if (!Array.isArray(items)) {
        throw new Error('Invalid data format: expected array');
      }
  
      // DEBUG: Log initial items structure
      console.log('Initial order items:', JSON.stringify(initialItems, null, 2));
  
      // Create a Set of names from initial order (case-insensitive)
      const initialOrderNames = new Set(
        initialItems
          .map(item => item?.name?.toLowerCase())
          .filter(Boolean)
      );
  
      console.log('Initial order item names:', Array.from(initialOrderNames));
  
      // Filter available items
      const availableItems = items
        .filter(item => item && item._id && item.name && item.price)
        .filter(item => item.available !== false);
  
      // Filter out items already in initial order (by name)
      const filteredItems = availableItems.filter(item => 
        !initialOrderNames.has(item.name.toLowerCase())
      );
  
      console.log('Available items after filtering:', filteredItems.map(i => i.name));
  
      if (isMounted) {
        setMenuItems(filteredItems);
        
        const initialQuantities = {};
        filteredItems.forEach(item => {
          initialQuantities[item._id] = 0;
        });
        
        setQuantities(initialQuantities);
      }
    } catch (err) {
      if (isMounted) {
        console.error('Failed to fetch menu items:', err);
        setError(err.message);
        setMenuItems([]);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  
    return () => {
      isMounted = false;
    };
  }, [initialItems]);

  useEffect(() => {
    if (visible) {
      fetchMenuItems();
    }
  }, [visible, fetchMenuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.itemType === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const handleQuantityChange = useCallback((itemId, value) => {
    const numValue = value === '' ? 0 : parseInt(value.replace(/[^0-9]/g, '') || 0);
    
    setQuantities(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  }, []);

  const incrementQuantity = useCallback((itemId) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  }, []);

  const decrementQuantity = useCallback((itemId) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) - 1)
    }));
  }, []);

  const handleAddItems = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const selectedItems = menuItems
        .filter(item => quantities[item._id] > 0)
        .map(item => ({
          ...item,
          orderQuantity: quantities[item._id],
          isBulkOrder: true,
        }));
        
      const combinedItems = [...initialItems, ...selectedItems];
      const totalQuantity = combinedItems.reduce((sum, item) => sum + item.orderQuantity, 0);
      
      if (totalQuantity < 5) {
        Alert.alert(
          'Minimum Quantity Required',
          'You must order at least 5 items in total',
          [{ text: 'OK' }]
        );
        return;
      }
      
      onComplete(combinedItems);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  }, [quantities, menuItems, onComplete, onClose, isProcessing, initialItems]);

  const renderItem = useCallback(({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>Rs {item.price.toFixed(2)}</Text>
        <Text style={styles.itemType}>{item.itemType}</Text>
      </View>
      
      <View style={styles.quantityControls}>
        <TouchableOpacity 
          style={styles.quantityButton} 
          onPress={() => decrementQuantity(item._id)}
          disabled={quantities[item._id] <= 0}
        >
          <Icon name="remove" size={20} color={quantities[item._id] <= 0 ? '#ccc' : '#8B0000'} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.quantityInput}
          value={quantities[item._id]?.toString()}
          onChangeText={(text) => handleQuantityChange(item._id, text)}
          keyboardType="number-pad"
          maxLength={3}
        />
        
        <TouchableOpacity 
          style={styles.quantityButton} 
          onPress={() => incrementQuantity(item._id)}
        >
          <Icon name="add" size={20} color='#8B0000' />
        </TouchableOpacity>
      </View>
    </View>
  ), [decrementQuantity, handleQuantityChange, incrementQuantity, quantities]);


  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Items to Bulk Order</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#8B0000" />
          </TouchableOpacity>
        </View>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={40} color="#FF0000" />
            <Text style={styles.errorText}>Failed to load menu items</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchMenuItems}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B0000" />
            <Text style={styles.loadingText}>Loading menu items...</Text>
          </View>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search menu items..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            <View style={styles.categoryContainer}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.selectedCategoryButton
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && styles.selectedCategoryText
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.noteText}>
              Note: Maximum 10 items total (mix of regular and special)
            </Text>
            
            {menuItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="restaurant-menu" size={40} color="#8B0000" />
                <Text style={styles.emptyText}>
                  {initialItems.length > 0 
                    ? 'All available items are already in your order' 
                    : 'No items available at this time'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No items match your search
                    </Text>
                  </View>
                }
              />
            )}
          </>
        )}
        
        <TouchableOpacity 
          style={[
            styles.addButton,
            (loading || error || menuItems.length === 0 || isProcessing) && styles.disabledButton
          ]} 
          onPress={handleAddItems}
          disabled={loading || error || menuItems.length === 0 || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.addButtonText}>
              {initialItems.length > 0 ? 'Update Order' : 'Add to Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

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
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryButton: {
    backgroundColor: '#8B0000',
  },
  categoryText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#FFF',
  },
  noteText: {
    color: '#8B0000',
    fontSize: 14,
    fontStyle: 'italic',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  listContainer: {
    paddingBottom: 80,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
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
  itemType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 3,
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
    width: 40,
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
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#8B0000',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    color: '#8B0000',
    fontSize: 16,
    textAlign: 'center',
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
  disabledButton: {
    backgroundColor: '#CCC',
  },
});

export default FBulkOrderPopup;