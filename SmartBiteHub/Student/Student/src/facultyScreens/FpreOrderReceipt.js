import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Platform, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SocketService from '../services/socket.js';

const { width } = Dimensions.get('window');

const FpreOrderReceiptScreen = ({ route, navigation }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const receiptRef = useRef();
  const qrCodeRef = useRef();

  // WebSocket Connection for Real-time Updates
  useEffect(() => {
    let isMounted = true;
    const handleOrderUpdate = (updatedOrder) => {
      if (isMounted && orderDetails?.orderId === updatedOrder._id) {
        setOrderDetails(prev => ({
          ...prev,
          status: updatedOrder.status,
          deliveryDate: updatedOrder.deliveryDate || prev.deliveryDate,
          deliveryTime: updatedOrder.deliveryTime || prev.deliveryTime
        }));
      }
    };

    const initializeSocket = async () => {
      try {
        await SocketService.connect();
        if (orderDetails?.orderId) {
          SocketService.subscribe('order_update', handleOrderUpdate);
          const email = await AsyncStorage.getItem('email');
          if (email) {
            await SocketService.joinOrderRoom(orderDetails.orderId, email);
          }
        }
      } catch (error) {
        console.error('Socket error:', error);
      }
    };

    if (orderDetails?.orderId) initializeSocket();

    return () => {
      isMounted = false;
      SocketService.unsubscribe('order_update');
      SocketService.disconnect();
    };
  }, [orderDetails?.orderId]);

  // Initialize Order Details
  useEffect(() => {
    if (route.params?.orderDetails) {
      const formattedDetails = {
        ...route.params.orderDetails,
        status: route.params.orderDetails.status || 'Pending',
        orderId: route.params.orderDetails._id || route.params.orderDetails.orderId,
        deliveryDate: route.params.orderDetails.deliveryDate,
        deliveryTime: route.params.orderDetails.deliveryTime
      };
      setOrderDetails(formattedDetails);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [route.params]);

  // Date Formatting Utilities
  const formatDeliveryDate = () => {
    if (!orderDetails?.deliveryDate) return 'Not specified';
    const date = new Date(orderDetails.deliveryDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDeliveryTime = () => {
    if (!orderDetails?.deliveryTime) return 'Not specified';
    return orderDetails.deliveryTime;
  };

  // Receipt Generation Functions
  const captureQrCode = async () => {
    try {
      if (!qrCodeRef.current) return null;
      await new Promise(resolve => setTimeout(resolve, 100));
      const uri = await captureRef(qrCodeRef.current, { format: 'png', quality: 1 });
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('QR capture error:', error);
      return null;
    }
  };

  const generateReceiptHTML = async (qrData) => {
    if (!orderDetails) return '';

    const itemsHTML = orderDetails.items.map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0e0d0;">
          <div style="font-weight: 600; color: #5c2c2c; margin-bottom: 2px;">${item.itemName}</div>
          <div style="font-size: 12px; color: #8c5e5e;">
            Qty: ${item.quantity} × Rs${item.itemPrice?.toFixed(2) || '0.00'}
          </div>
        </td>
        <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #f0e0d0;">
          Rs${((item.itemPrice || 0) * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const total = orderDetails.items.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0);

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt #${orderDetails.orderId}</title>
          <style>
            body { 
              font-family: 'Helvetica Neue', Arial, sans-serif; 
              padding: 0; 
              margin: 0; 
              color: #5c2c2c;
              background: #fff9f0;
            }
            .receipt-container {
              max-width: 100%;
              margin: 0 auto;
              background: white;
              padding: 15px;
              box-shadow: 0 1px 5px rgba(0,0,0,0.05);
              border-radius: 8px;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
              padding-bottom: 12px;
              border-bottom: 1px solid #f0e0d0;
            }
            .logo {
              font-size: 20px;
              font-weight: bold;
              color: #800000;
              margin-bottom: 4px;
            }
            .receipt-title {
              font-size: 16px;
              font-weight: 700;
              margin: 6px 0 4px;
              color: #5c2c2c;
            }
            .receipt-meta {
              font-size: 12px;
              color: #8c5e5e;
              margin: 4px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .total-row {
              font-weight: bold;
              font-size: 15px;
              margin-top: 12px;
              padding-top: 10px;
              border-top: 1px solid #f0e0d0;
              display: flex;
              justify-content: space-between;
            }
            .thank-you {
              text-align: center;
              margin-top: 12px;
              color: #8c5e5e;
              font-size: 13px;
              line-height: 1.4;
              padding: 10px;
              background: #fff9f0;
              border-radius: 6px;
            }
            .customer-info {
              margin: 12px 0;
              padding: 12px;
              font-size: 12px;
              background: #fff9f0;
              border-radius: 6px;
            }
            .info-row {
              display: flex;
              margin-bottom: 6px;
            }
            .info-label {
              font-weight: 600;
              color: #800000;
              min-width: 80px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 600;
              margin-top: 6px;
              text-transform: uppercase;
            }
            .pending {
              background: #fff0e0;
              color: #800000;
            }
            .completed {
              background: #f0f8e0;
              color: #2E7D32;
            }
            .qr-container {
              margin: 15px auto;
              text-align: center;
              padding: 12px;
              background: white;
              border: 1px solid #f0e0d0;
              border-radius: 6px;
              display: inline-block;
            }
            .qr-label {
              font-size: 11px;
              color: #8c5e5e;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div style="padding: 12px;">
            <div class="receipt-container">
              <div class="header">
                <div class="logo">SmartBiteHub</div>
                <div class="receipt-title">PRE-ORDER RECEIPT</div>
                <div class="receipt-meta">
                  Scheduled for ${formatDeliveryDate()} at ${formatDeliveryTime()}
                </div>
                <div class="status-badge ${orderDetails.status.toLowerCase()}">
                  ${orderDetails.status}
                </div>
              </div>
              
              <div class="customer-info">
                <div class="info-row">
                  <span class="info-label">Order #:</span>
                  <span>${orderDetails.orderId || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Token:</span>
                  <span style="color: #800000; font-weight: bold;">
                    ${orderDetails.token || 'N/A'}
                  </span>
                </div>
                <div style="margin-top: 8px;">
                  <div class="info-row">
                    <span class="info-label">Location:</span>
                    <span>
                      ${orderDetails.wing || ''} Wing, 
                      Floor ${orderDetails.floor || ''}, 
                      Room ${orderDetails.roomNumber || ''}
                    </span>
                  </div>
                </div>
              </div>

              <table>
                ${itemsHTML}
              </table>
              
              <div class="total-row">
                <span>TOTAL:</span>
                <span style="color: #800000; font-size: 16px; font-weight: 700;">
                  Rs${total.toFixed(2)}
                </span>
              </div>
              
              <div style="text-align: center; margin: 15px 0;">
                <div class="qr-container">
                  <div class="qr-label">Scan for order tracking</div>
                  ${qrData ? `<img src="${qrData}" />` : 'QR Code not available'}
                </div>
              </div>
              
              <div class="thank-you">
                Thank you for your pre-order!<br>
                Your meal will be prepared fresh and delivered as scheduled.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const saveReceipt = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const qrData = await captureQrCode();
      const html = await generateReceiptHTML(qrData);
      const { uri } = await Print.printToFileAsync({ html });

      const newUri = Platform.OS === 'android' 
        ? `${FileSystem.documentDirectory}Download/Receipt_${orderDetails.orderId}.pdf`
        : `${FileSystem.documentDirectory}Receipt_${orderDetails.orderId}.pdf`;

      await FileSystem.copyAsync({ from: uri, to: newUri });

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(newUri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          type: 'application/pdf'
        });
      } else {
        Alert.alert('Success', 'Receipt saved to app documents');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#800000" />
      </View>
    );
  }

  if (!orderDetails) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No order details available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={receiptRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receiptContainer}>
          <View style={styles.header}>
            <Text style={styles.logo}>SmartBiteHub</Text>
            <Text style={styles.receiptTitle}>PRE-ORDER RECEIPT</Text>
            <Text style={styles.receiptMeta}>
              Scheduled for {formatDeliveryDate()} at {formatDeliveryTime()}
            </Text>
            <View style={[styles.statusBadge, styles[`${orderDetails.status.toLowerCase()}Badge`]]}>
              <Text style={styles.statusText}>{orderDetails.status}</Text>
            </View>
          </View>

          <View style={styles.customerInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order #:</Text>
              <Text style={styles.infoValue}>{orderDetails.orderId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Token:</Text>
              <Text style={[styles.infoValue, styles.tokenText]}>{orderDetails.token}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>
                {orderDetails.wing} Wing, Floor {orderDetails.floor}, Room {orderDetails.roomNumber}
              </Text>
            </View>
          </View>

          <View style={styles.itemsContainer}>
            {orderDetails.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} × Rs{item.itemPrice.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  Rs{(item.itemPrice * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalAmount}>
              Rs{orderDetails.items.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.qrContainer} ref={qrCodeRef}>
            <Text style={styles.qrLabel}>Scan for order tracking</Text>
            <QRCode
              value={JSON.stringify({
                orderId: orderDetails.orderId,
                deliveryDate: orderDetails.deliveryDate,
                deliveryTime: orderDetails.deliveryTime
              })}
              size={width * 0.4}
              color="#800000"
              backgroundColor="white"
            />
          </View>

          <Text style={styles.thankYou}>
            Thank you for your pre-order!{'\n'}
            Your meal will be prepared fresh and delivered as scheduled.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.navigate('FpreCancelOrderScreen', { 
              orderId: orderDetails.orderId 
            })}
          >
            <Ionicons name="close-circle" size={20} color="white" />
            <Text style={styles.buttonText}>Cancel Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveReceipt}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="white" />
                <Text style={styles.buttonText}>Save Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff9f0',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8c5e5e',
  },
  receiptContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e0d0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#800000',
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c2c2c',
    marginVertical: 4,
  },
  receiptMeta: {
    fontSize: 14,
    color: '#8c5e5e',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  pendingBadge: {
    backgroundColor: '#fff0e0',
  },
  completedBadge: {
    backgroundColor: '#e8f5e9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  customerInfo: {
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#800000',
    width: 80,
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    color: '#5c2c2c',
    flex: 1,
  },
  tokenText: {
    color: '#800000',
    fontWeight: '700',
  },
  itemsContainer: {
    marginVertical: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e0d0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c2c2c',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#8c5e5e',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c2c2c',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0e0d0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5c2c2c',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#800000',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0e0d0',
  },
  qrLabel: {
    fontSize: 12,
    color: '#8c5e5e',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  thankYou: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8c5e5e',
    lineHeight: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff9f0',
    borderRadius: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#800000',
  },
  saveButton: {
    backgroundColor: '#800000',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 100,
  },
});

export default FpreOrderReceiptScreen;