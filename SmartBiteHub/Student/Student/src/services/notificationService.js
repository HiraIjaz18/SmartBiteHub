import { Vibration } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://172.21.12.17:4000';

// Create a simple event emitter for React Native
class ReactNativeEventEmitter {
  constructor() {
    this.listeners = {};
  }

  addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    return () => this.removeListener(event, callback);
  }

  removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
    }
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(...args));
    }
  }
}

const notificationEmitter = new ReactNativeEventEmitter();

class NotificationService {
  constructor() {
    this.notificationQueue = [];
    this.isShowing = false;
  }

  subscribe(callback) {
    const unsubscribe = notificationEmitter.addListener('notification', callback);
    return unsubscribe; // Directly return the cleanup function
  }

  async showNotification(notification) {
    if (!['status', 'time', 'system'].includes(notification.type)) {
      notification.type = 'system';
    }

    if (this.isShowing) {
      this.notificationQueue.push(notification);
      return;
    }

    this.isShowing = true;

    try {
      Vibration.vibrate([500, 200, 500]);
      notificationEmitter.emit('notification', notification);

      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/notifications`, notification, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return notification;
    } catch (error) {
      console.error('Notification error:', error);
    } finally {
      this.isShowing = false;
      this.processQueue();
    }
  }

  processQueue() {
    if (this.notificationQueue.length > 0 && !this.isShowing) {
      const nextNotification = this.notificationQueue.shift();
      this.showNotification(nextNotification);
    }
  }

  async getUnreadNotifications() {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Fetch notifications error:', error);
      return [];
    }
  }

  async markAsRead(notificationId) {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }
}

export default new NotificationService();