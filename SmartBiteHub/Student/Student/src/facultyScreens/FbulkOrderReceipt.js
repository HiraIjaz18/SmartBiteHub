import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Dimensions } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SocketService from '../services/socket.js';

const { width } = Dimensions.get('window');

const FbulkOrderReceipt= ({ route, navigation }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const receiptRef = useRef();
  const qrCodeRef = useRef();

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ Updated Socket Effect ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
useEffect(() => {
  let isMounted = true;
  const handleOrderUpdate = (updatedOrder) => {
    if (isMounted && orderDetails?.orderId === updatedOrder._id) {
      setOrderDetails(prev => ({
        ...prev,
        status: updatedOrder.status,
        pickupDate: updatedOrder.pickupDate || prev.pickupDate
      }));
    }
  };

  const initializeSocket = async () => {
    try {
      await SocketService.connect();
      if (orderDetails?.orderId) {
        // Subscribe to order updates
        SocketService.subscribe('order_update', handleOrderUpdate);
        
        try {
          // Join the order room
          const email = await AsyncStorage.getItem('email');
          if (email) {
            await SocketService.joinOrderRoom(orderDetails.orderId, email);
          }
        } catch (storageError) {
          console.error('Failed to get email from storage:', storageError);
        }
      }
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  };

  if (orderDetails?.orderId) {
    initializeSocket();
  }

  return () => {
    isMounted = false;
    if (orderDetails?.orderId) {
      // Unsubscribe from order updates
      SocketService.unsubscribe('order_update');
    }
  };
}, [orderDetails?.orderId]);
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ End Socket Effect ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  useEffect(() => {
    let isMounted = true;
    
    if (route.params?.orderDetails && isMounted) {
      setOrderDetails({
        ...route.params.orderDetails,
        status: route.params.orderDetails.status || 'Pending',
        orderId: route.params.orderDetails._id || route.params.orderDetails.orderId,
      });
      setLoading(false);
    } else if (isMounted) {
      setLoading(false);
    }

    return () => { isMounted = false };
  }, [route.params]);

  const captureQrCode = async () => {
    try {
      if (qrCodeRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const uri = await captureRef(qrCodeRef.current, {
          format: 'png',
          quality: 1,
        });
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/png;base64,${base64}`;
      }
      return null;
    } catch (error) {
      console.error('Error capturing QR code:', error);
      return null;
    }
  };

  const generateReceiptHTML = (qrData) => {
    if (!orderDetails || !orderDetails.items) return '';

    const orderDate = orderDetails.pickupDate  
      ? new Date(orderDetails.pickupDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) 
      : 'Not specified';

    const itemsHTML = orderDetails.items.map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0e0d0;">
          <div style="font-weight: 600; color: #5c2c2c; margin-bottom: 2px;">${item.itemName}</div>
          <div style="font-size: 12px; color: #8c5e5e;">Qty: ${item.quantity} × Rs${item.itemPrice?.toFixed(2) || '0.00'}</div>
        </td>
        <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #f0e0d0; font-weight: 500; color: #5c2c2c;">
          Rs${((item.itemPrice || 0) * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const subtotal = orderDetails.items.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0);
    const total = subtotal;

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
            .location-info {
              display: flex;
              gap: 15px;
              margin-top: 6px;
            }
            .location-item {
              display: flex;
              align-items: center;
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
                <div class="receipt-title">ORDER RECEIPT</div>
                <div class="receipt-meta">${orderDate}</div>
                <div class="status-badge ${orderDetails.status.toLowerCase()}">${orderDetails.status}</div>
              </div>
              
              <div class="customer-info">
                <div class="info-row">
                  <span class="info-label">Order #:</span>
                  <span>${orderDetails.orderId || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Token:</span>
                  <span style="color: #800000; font-weight: bold;">${orderDetails.token || 'N/A'}</span>
                </div>
                <div class="location-info">
                  <div class="location-item">
                    <span style="font-weight:600;color:#800000;">Room:</span>
                    <span style="margin-left:4px">${orderDetails.roomNumber || 'N/A'}</span>
                  </div>
                  <div class="location-item">
                    <span style="font-weight:600;color:#800000;">Floor:</span>
                    <span style="margin-left:4px">${orderDetails.floor || 'N/A'}</span>
                  </div>
                  <div class="location-item">
                    <span style="font-weight:600;color:#800000;">Wing:</span>
                    <span style="margin-left:4px">${orderDetails.wing || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <table>
                ${itemsHTML}
              </table>
              
              <div class="total-row">
                <span>TOTAL:</span>
                <span style="color: #800000; font-size: 16px; font-weight: 700;">Rs${total.toFixed(2)}</span>
              </div>
              
              <div style="text-align: center; margin: 15px 0;">
                <div class="qr-container">
                  <div class="qr-label">Scan for order tracking</div>
                  ${qrData ? `<img class="qr-image" src="${qrData}" />` : 'QR Code not available'}
                </div>
              </div>
              
              <div class="thank-you">
                Thank you for your order!<br>
                Your order will be ready in approximately 5-10 minutes.
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
      if (!qrData) throw new Error('Failed to capture QR code');
      
      const html = generateReceiptHTML(qrData);
      const { uri } = await Print.printToFileAsync({
        html,
        width: 612,
        height: 792,
        margins: { top: 36, right: 36, bottom: 36, left: 36 }
      });

      if (Platform.OS === 'android') {
        const downloadsDir = `${FileSystem.documentDirectory}Download/`;
        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
        const newUri = `${downloadsDir}Receipt_${orderDetails.orderId}.pdf`;
        await FileSystem.copyAsync({ from: uri, to: newUri });
        
        try {
          const contentUri = await FileSystem.getContentUriAsync(newUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: 'application/pdf'
          });
        } catch (e) {
          console.warn('Could not open file manager', e);
          Alert.alert('Success', 'Receipt saved to Downloads folder');
        }
      } else {
        const newUri = `${FileSystem.documentDirectory}Receipt_${orderDetails.orderId}.pdf`;
        await FileSystem.copyAsync({ from: uri, to: newUri });
        Alert.alert('Success', 'Receipt saved to app documents');
      }
    } catch (error) {
      console.error('Save error:', error);
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
        contentContainerStyle={styles.content}
        ref={receiptRef}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receiptContainer}>
          <View style={styles.header}>
            <Text style={styles.logo}>SmartBiteHub</Text>
            <Text style={styles.receiptTitle}>ORDER RECEIPT</Text>
            <Text style={styles.receiptMeta}>
              {orderDetails.pickupDate ? 
                new Date(orderDetails.pickupDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 
                'Not specified'}
            </Text>
            <View style={[
              styles.statusBadge,
              orderDetails.status === 'Completed' ? styles.completedBadge : styles.pendingBadge
            ]}>
              <Text style={styles.statusText}>{orderDetails.status}</Text>
            </View>
          </View>

          <View style={styles.customerInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order #:</Text>
              <Text style={styles.infoValue}>{orderDetails.orderId || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Token:</Text>
              <Text style={[styles.infoValue, styles.tokenText]}>{orderDetails.token || 'N/A'}</Text>
            </View>
            <View style={styles.locationContainer}>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>Room:</Text>
                <Text style={styles.locationValue}>{orderDetails.roomNumber || 'N/A'}</Text>
              </View>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>Floor:</Text>
                <Text style={styles.locationValue}>{orderDetails.floor || 'N/A'}</Text>
              </View>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>Wing:</Text>
                <Text style={styles.locationValue}>{orderDetails.wing || 'N/A'}</Text>
              </View>
            </View>
          </View>

          <View style={{ marginVertical: 10 }}>
            <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
              <Text style={{ flex: 1, fontWeight: '600', color: '#5c2c2c' }}>Item</Text>
              <Text style={{ fontWeight: '600', color: '#5c2c2c' }}>Amount</Text>
            </View>
            {orderDetails.items.map((item, index) => (
              <View key={index.toString()} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity} × Rs{item.itemPrice?.toFixed(2) || '0.00'}</Text>
                </View>
                <Text style={styles.itemPrice}>Rs{((item.itemPrice || 0) * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
            <View style={[styles.infoRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0e0d0' }]}>
              <Text style={[styles.infoLabel, { fontWeight: 'bold' }]}>Total:</Text>
              <Text style={[styles.infoValue, { color: '#800000', fontWeight: 'bold', fontSize: 16 }]}>
                Rs{orderDetails.items.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.qrContainer} ref={qrCodeRef}>
            <Text style={styles.qrLabel}>Scan for order tracking</Text>
            <QRCode
              value={JSON.stringify({
                orderId: orderDetails.orderId,
                token: orderDetails.token,
                status: orderDetails.status
              })}
              size={width * 0.35}
              color="#800000"
              backgroundColor="white"
              getRef={(ref) => (qrCodeRef.current = ref)}
            />
          </View>

          <Text style={styles.thankYou}>
            Thank you for your order!{'\n'}
            Your order will be ready in approximately 5-10 minutes.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.navigate('FbulkcancelOrder', { orderId: orderDetails.orderId })}
          >
            <Ionicons name="close-circle" size={18} color="white" />
            <Text style={styles.buttonText}>Cancel Order</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.downloadButton} 
            onPress={saveReceipt}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="download" size={18} color="white" />
                <Text style={styles.buttonText}>Download Receipt</Text>
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
    padding: 10,
  },
  content: {
    paddingBottom: 70,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f0',
  },
  emptyText: {
    fontSize: 15,
    color: '#8c5e5e',
  },
  receiptContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e0d0',
    marginBottom: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#800000',
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 6,
    color: '#5c2c2c',
  },
  receiptMeta: {
    fontSize: 12,
    color: '#8c5e5e',
    marginVertical: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'center',
  },
  pendingBadge: {
    backgroundColor: '#fff0e0',
  },
  completedBadge: {
    backgroundColor: '#f0f8e0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  customerInfo: {
    marginVertical: 10,
    padding: 12,
    backgroundColor: '#fff9f0',
    borderRadius: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#800000',
    width: 80,
    fontSize: 12,
  },
  infoValue: {
    fontSize: 12,
    color: '#5c2c2c',
    flex: 1,
  },
  tokenText: {
    color: '#800000',
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 4,
  },
  locationLabel: {
    fontWeight: '600',
    color: '#800000',
    fontSize: 12,
    marginRight: 4,
  },
  locationValue: {
    fontSize: 12,
    color: '#5c2c2c',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e0d0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    color: '#5c2c2c',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#8c5e5e',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5c2c2c',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0e0d0',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  qrLabel: {
    fontSize: 11,
    color: '#8c5e5e',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  thankYou: {
    textAlign: 'center',
    marginTop: 12,
    color: '#8c5e5e',
    fontSize: 13,
    lineHeight: 18,
    padding: 10,
    backgroundColor: '#fff9f0',
    borderRadius: 6,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
 downloadButton: {
    backgroundColor: '#800000',
    flex: 1,
    backgroundColor: '#800000',
    borderRadius: 6,
    padding: 12,
    marginRight: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#800000',
    borderRadius: 6,
    padding: 12,
    marginRight: 5,
  },
  content: {
    paddingBottom: 100,
  },
});

export default FbulkOrderReceipt;