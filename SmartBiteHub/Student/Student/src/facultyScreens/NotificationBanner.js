import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import notificationService from '../services/notificationService';

const NotificationBanner = () => {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(notification => {
      setCurrentNotification(notification);
      showNotification();
    });
  
    return () => {
      // Change from subscription.unsubscribe() to:
      unsubscribe();
    };
  }, []);

  const showNotification = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.delay(4000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setCurrentNotification(null);
    });
  };

  if (!currentNotification) return null;

  const getIcon = () => {
    switch(currentNotification.type) {
      case 'status': return 'restaurant-outline';
      case 'time': return 'time-outline';
      default: return 'notifications-outline';
    }
  };

  const getColor = () => {
    switch(currentNotification.type) {
      case 'status': return '#27ae60';
      case 'time': return '#3498db';
      default: return '#9b59b6';
    }
  };

  return (
    <Animated.View style={[
      styles.container,
      { backgroundColor: getColor(), opacity: fadeAnim }
    ]}>
      <Ionicons name={getIcon()} size={24} color="white" style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.title}>{currentNotification.title}</Text>
        <Text style={styles.message}>{currentNotification.message}</Text>
      </View>
      <TouchableOpacity onPress={() => fadeAnim.setValue(0)}>
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5
  },
  icon: {
    marginRight: 12
  },
  content: {
    flex: 1
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 3
  },
  message: {
    color: 'white',
    fontSize: 14
  }
});

export default NotificationBanner;