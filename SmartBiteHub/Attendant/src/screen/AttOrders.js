import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Svg, { Rect, Path, Text as SvgText } from 'react-native-svg';
import axios from 'axios';
import io from 'socket.io-client';

const colors = {
  primary: '#2F4858',      // Dark Slate
  secondary: '#33658A',    // Deep Azure
  accent: '#86BBD8',       // Sky Blue
  highlight: '#F6AE2D',    // Golden Yellow
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#2D2D2A',
  lightText: '#6B6B68',
  border: '#D3D3D3',
  gridLine: '#E0E0E0',
  delivered: '#55A630',    // Green
  pending: '#D00000'       // Red
};

const priorityColors = {
  1: colors.pending,
  2: colors.highlight,
  3: colors.secondary,
  4: colors.accent,
  5: colors.lightText
};

const FLOOR_PRIORITY = {
  'Basement': 1,
  'Ground': 2,
  'First': 3,
  'Second': 4,
  'Third': 5
};

const floorOptions = [
  { id: 'Basement', name: 'Basement' },
  { id: 'Ground', name: 'Ground' },
  { id: 'First', name: '1st Floor' },
  { id: 'Second', name: '2nd Floor' },
  { id: 'Third', name: '3rd Floor' }
];

const socket = io('http://172.21.12.98:4000', {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false
});

const OrderDetailsModal = ({ visible, order, onClose, onStatusUpdate }) => {
  if (!order) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.modalHeader}
          >
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <FontAwesome5 name="map-marker-alt" size={20} color="white" />
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoValue}>{order.roomNumber}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <FontAwesome5 name="layer-group" size={20} color="white" />
                <Text style={styles.infoLabel}>Floor:</Text>
                <Text style={styles.infoValue}>{order.floor}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <FontAwesome5 name="shipping-fast" size={20} color="white" />
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[
                  styles.infoValue,
                  order.status === 'Pending' ? styles.statusPending :
                  order.status === 'On the Way' ? styles.statusOnWay :
                  styles.statusDelivered
                ]}>
                  {order.status}
                </Text>
              </View>
            </View>

            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              {(order.items || []).map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>Rs {item.price?.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>Rs {order.totalPrice?.toFixed(2)}</Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            {order.status === 'Pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => onStatusUpdate(order._id, 'On the Way')}
              >
                <FontAwesome5 name="truck" size={20} color="white" />
                <Text style={styles.buttonText}>Start Delivery</Text>
              </TouchableOpacity>
            )}
            
            {order.status === 'On the Way' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => onStatusUpdate(order._id, 'Delivered')}
              >
                <FontAwesome5 name="check-double" size={20} color="white" />
                <Text style={styles.buttonText}>Mark Delivered</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FloorMap = ({ currentFloor, orders = [], onRoomPress }) => {
  const { width } = Dimensions.get('window');
  const mapWidth = width - 40;
  const mapHeight = 400;
  const gridSize = 50;

  const generateMapGrid = () => {
    const gridElements = [];
    
    // Vertical grid lines
    for(let x = 0; x < mapWidth; x += gridSize) {
      gridElements.push(
        <Path
          key={`v${x}`}
          d={`M ${x} 0 L ${x} ${mapHeight}`}
          stroke={colors.gridLine}
          strokeWidth="0.5"
        />
      );
    }

    // Horizontal grid lines
    for(let y = 0; y < mapHeight; y += gridSize) {
      gridElements.push(
        <Path
          key={`h${y}`}
          d={`M 0 ${y} L ${mapWidth} ${y}`}
          stroke={colors.gridLine}
          strokeWidth="0.5"
        />
      );
    }

    // Coordinate labels
    for(let x = 0; x < mapWidth; x += gridSize) {
      gridElements.push(
        <SvgText
          key={`x${x}`}
          x={x + 5}
          y={mapHeight - 5}
          fill={colors.lightText}
          fontSize="10"
        >
          {x}
        </SvgText>
      );
    }

    for(let y = 0; y < mapHeight; y += gridSize) {
      gridElements.push(
        <SvgText
          key={`y${y}`}
          x={5}
          y={y - 5}
          fill={colors.lightText}
          fontSize="10"
        >
          {y}
        </SvgText>
      );
    }

    return gridElements;
  };

  const generateDeliveryMarkers = () => {
    const markers = [];
    const startX = 50;
    const startY = 50;
    const spacing = 80;

    orders.forEach((order, index) => {
      if (order.floor === currentFloor) {
        const x = startX + (index * spacing) % (mapWidth - 100);
        const y = startY + Math.floor(index / 5) * spacing;

        markers.push(
          <TouchableOpacity
            key={order._id}
            onPress={() => onRoomPress(order.roomNumber)}
            style={{ position: 'absolute', left: x - 20, top: y - 20 }}
          >
            <FontAwesome5
              name={order.status === 'Delivered' ? 'check-circle' : 'map-marker-alt'}
              size={40}
              color={order.status === 'Delivered' ? colors.delivered : colors.pending}
            />
            <Text style={styles.markerText}>
              {order.roomNumber}
            </Text>
            <Text style={styles.sequenceText}>
              {index + 1}
            </Text>
          </TouchableOpacity>
        );
      }
    });

    return markers;
  };

  return (
    <View style={[styles.mapCard, { height: mapHeight + 120 }]}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.mapHeader}
      >
        <FontAwesome5 name="map" size={20} color="white" />
        <Text style={styles.mapTitle}>{currentFloor} Floor Delivery Map</Text>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg height={mapHeight} width={mapWidth * 1.2}>
          {/* Grid Background */}
          {generateMapGrid()}

          {/* Delivery Markers */}
          {generateDeliveryMarkers()}

          {/* Map Features */}
          <SvgText
            x={mapWidth - 60}
            y={30}
            fill={colors.primary}
            fontSize="14"
            fontWeight="bold"
          >
            <FontAwesome5 name="compass" size={14} /> N
          </SvgText>

          <Rect
            x={20}
            y={mapHeight - 40}
            width={100}
            height={4}
            fill={colors.primary}
          />
          <SvgText
            x={70}
            y={mapHeight - 45}
            fill={colors.primary}
            fontSize="10"
          >
            100m Scale
          </SvgText>
        </Svg>
      </ScrollView>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <FontAwesome5 name="map-marker-alt" size={16} color={colors.pending} />
          <Text style={styles.legendText}>Pending Delivery</Text>
        </View>
        <View style={styles.legendItem}>
          <FontAwesome5 name="check-circle" size={16} color={colors.delivered} />
          <Text style={styles.legendText}>Delivered</Text>
        </View>
      </View>
    </View>
  );
};

const AttOrders = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentFloor, setCurrentFloor] = useState('Ground');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_BASE_URL = 'http://172.21.12.98:4000/api/attendant';

  useEffect(() => {
    const handleOrderUpdate = (updatedOrder) => {
      setOrders(prev => prev.map(order => 
        order._id === updatedOrder._id ? { 
          ...updatedOrder, 
          floor: updatedOrder.floor.replace(/^\w/, c => c.toUpperCase()) 
        } : order
      ));
    };

    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
      socket.emit('join', 'attendant-room');
    });

    socket.on('orderUpdated', handleOrderUpdate);
    socket.on('connect_error', (err) => {
      console.log('Connection error:', err.message);
    });

    return () => {
      socket.off('orderUpdated', handleOrderUpdate);
      socket.off('connect');
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setRefreshing(true);
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/queue`);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        setOrders(response.data.data);
      } else {
        setOrders([]);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch orders. Check connection');
      setOrders([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId, status) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/${orderId}/status`, { status });
      
      if (response.data.success) {
        socket.emit('updateOrderStatus', { orderId, status });
        setIsModalVisible(false);
        Alert.alert('Success', `Order marked as ${status}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Status update failed');
    }
  };

  const handleRoomPress = (roomNumber) => {
    const order = orders.find(o => 
      o.roomNumber === roomNumber && 
      o.floor.toLowerCase() === currentFloor.toLowerCase()
    );
    
    if (order) {
      setSelectedOrder(order);
      setIsModalVisible(true);
    }
  };

  const renderOrderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          item.status === 'Delivered' && styles.deliveredCard
        ]}
        onPress={() => {
          setSelectedOrder(item);
          setIsModalVisible(true);
        }}
      >
        <View style={styles.orderHeader}>
          <View style={[
            styles.orderPriority,
            { backgroundColor: priorityColors[FLOOR_PRIORITY[item.floor] || 3] }
          ]}>
            <Text style={styles.orderFloor}>{item.floor}</Text>
          </View>
          <Text style={styles.orderRoom}>{item.roomNumber}</Text>
          {item.status === 'Pending' && (
            <FontAwesome5 name="clock" size={20} color={colors.pending} />
          )}
          {item.status === 'On the Way' && (
            <FontAwesome5 name="truck" size={20} color={colors.highlight} />
          )}
          {item.status === 'Delivered' && (
            <FontAwesome5 name="check-double" size={20} color={colors.delivered} />
          )}
        </View>
        <Text style={styles.orderItems}>
          {(item.items || []).length} items • Rs {item.totalPrice?.toFixed(2)}
        </Text>
        <View style={styles.orderFooter}>
          <FontAwesome5 name="clock" size={16} color={colors.lightText} />
          <Text style={styles.orderTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredOrders = orders.filter(o => 
    o.floor.toLowerCase() === currentFloor.toLowerCase()
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome5 name="exclamation-triangle" size={48} color={colors.pending} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchOrders}
        >
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.floorSelector}>
        {floorOptions.map(floor => (
          <TouchableOpacity
            key={floor.id}
            style={[
              styles.floorButton, 
              currentFloor === floor.id && styles.activeFloorButton
            ]}
            onPress={() => setCurrentFloor(floor.id)}
          >
            <Text style={[
              styles.floorButtonText,
              currentFloor === floor.id && styles.activeFloorButtonText
            ]}>
              {floor.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FloorMap 
        currentFloor={currentFloor} 
        orders={filteredOrders}
        onRoomPress={handleRoomPress} 
      />

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchOrders}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="map-marked" size={48} color={colors.lightText} />
            <Text style={styles.emptyText}>No orders found on {currentFloor} floor</Text>
          </View>
        }
      />

      <OrderDetailsModal
        visible={isModalVisible}
        order={selectedOrder}
        onClose={() => setIsModalVisible(false)}
        onStatusUpdate={handleStatusUpdate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.text,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    color: colors.pending,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  floorSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  floorButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  activeFloorButton: {
    backgroundColor: colors.primary,
  },
  floorButtonText: {
    color: colors.lightText,
    fontWeight: '500',
    fontSize: 12,
  },
  activeFloorButtonText: {
    color: 'white',
  },
  mapCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.primary,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 12,
  },
  markerText: {
    position: 'absolute',
    bottom: -20,
    width: 80,
    textAlign: 'center',
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  sequenceText: {
    position: 'absolute',
    top: 8,
    left: 12,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    marginLeft: 8,
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deliveredCard: {
    opacity: 0.7,
    backgroundColor: '#DFF0D8',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderPriority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  orderFloor: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  orderRoom: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  orderItems: {
    color: colors.lightText,
    marginBottom: 8,
    fontSize: 14,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTime: {
    color: colors.lightText,
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  modalContent: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    marginLeft: 8,
    marginRight: 4,
    color: colors.lightText,
  },
  infoValue: {
    color: colors.text,
    fontWeight: '500',
  },
  statusPending: {
    color: colors.pending,
  },
  statusOnWay: {
    color: colors.highlight,
  },
  statusDelivered: {
    color: colors.delivered,
  },
  itemsSection: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    flex: 2,
  },
  itemQty: {
    flex: 1,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  totalSection: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
  totalValue: {
    fontWeight: '600',
    fontSize: 16,
    color: colors.primary,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  completeButton: {
    backgroundColor: colors.delivered,
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default AttOrders;