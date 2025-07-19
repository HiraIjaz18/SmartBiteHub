import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RegularOrderPopup = ({ visible, onClose, currentOrder = [], onAddItems }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    const fetchRegularItems = async () => {
      try {
        const response = await fetch('http://172.21.12.17:4000/api/daily/menu-items');
        const result = await response.json();
        const data = result.data || [];

        const regularItems = data.filter(item => item.itemType === 'Regular' && item.availability);

        const initialQuantities = {};
        regularItems.forEach(item => {
          initialQuantities[item._id] = 0;
        });

        setQuantities(initialQuantities);
        setMenuItems(regularItems);

      } catch (error) {
        Alert.alert('Error', 'Failed to load regular items');
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      fetchRegularItems();
    }
  }, [visible]);

  const handleQuantityChange = (itemId, value) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    const newValue = Math.max(0, Math.min(numericValue, 4));
    setQuantities(prev => ({ ...prev, [itemId]: newValue }));
  };

  const handleConfirm = () => {
    const selectedItems = menuItems
      .filter(item => quantities[item._id] > 0)
      .map(item => ({
        ...item,
        orderQuantity: quantities[item._id],
        itemType: 'Regular'
      }));

    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please add at least one regular item');
      return;
    }

    const mergedItems = [...currentOrder];
    selectedItems.forEach(newItem => {
      const existingIndex = mergedItems.findIndex(i => i._id === newItem._id);
      if (existingIndex >= 0) {
        mergedItems[existingIndex].orderQuantity += newItem.orderQuantity;
      } else {
        mergedItems.push(newItem);
      }
    });

    onAddItems(mergedItems);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Regular Items</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#8B0000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8B0000" />
        ) : (
          <FlatList
            data={menuItems}
            keyExtractor={item => item._id}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No regular items available</Text>
            )}
            renderItem={({ item }) => (
              <View style={styles.itemContainer}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>Rs.{Number(item.price).toFixed(2)}</Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity onPress={() => handleQuantityChange(item._id, 0)} disabled={quantities[item._id] === 0}>
                    <Icon name="delete" size={24} color={quantities[item._id] ? "#8B0000" : "#ccc"} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={String(quantities[item._id] || 0)}
                    onChangeText={text => handleQuantityChange(item._id, text)}
                    keyboardType="numeric"
                    maxLength={1}
                  />
                  <TouchableOpacity onPress={() => handleQuantityChange(item._id, quantities[item._id] + 1)} disabled={quantities[item._id] >= 4}>
                    <Icon name="add" size={24} color={quantities[item._id] < 4 ? "#8B0000" : "#ccc"} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={loading}>
          <Text style={styles.buttonText}>Add Items</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B0000'
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  itemInfo: {
    flex: 1,
    marginRight: 15
  },
  itemName: {
    fontSize: 16,
    color: '#333'
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  quantityInput: {
    width: 40,
    height: 40,
    textAlign: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16
  },
  confirmButton: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16
  }
});

export default RegularOrderPopup;
