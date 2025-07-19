import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const EnhancedCircularTimer = ({ onTimerEnd, orderPlacedTime }) => {
  const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  // Start timer when order is placed
  useEffect(() => {
    if (orderPlacedTime) {
      setIsActive(true);
      setTimeLeft(2700); // Reset to 45 minutes
      
      // Start animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      setIsActive(false);
      pulseAnim.stopAnimation();
    }
  }, [orderPlacedTime]);

  // Glow animation for critical time
  useEffect(() => {
    if (timeLeft < 300 && timeLeft > 0 && isActive) { // Last 5 minutes
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
          })
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [timeLeft, isActive]);

  // Countdown logic
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimerEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (!isActive) return '#800000'; // Maroon when inactive
    if (timeLeft < 60) return '#CC5500'; // Dark orange when <1 min
    if (timeLeft < 300) return '#FF8C00'; // Yellow-orange when <5 min
    return '#800000'; // Maroon when normal
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,140,0,0)', 'rgba(255,140,0,0.2)']
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.card,
        { transform: [{ scale: cardScale }] }
      ]}>
        <Animated.View style={[
          styles.glow,
          { backgroundColor: glowColor }
        ]} />
        
        <Animated.View style={[
          styles.timeCircle, 
          { 
            transform: [{ scale: pulseAnim }],
            borderColor: getStatusColor(),
          }
        ]}>
          <Text style={[styles.timeText, { color: getStatusColor() }]}>
            {formatTime(timeLeft)}
          </Text>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {isActive ? 
              (timeLeft > 0 ? 'ESTIMATED READY TIME' : 'ORDER READY') : 
              'NO ACTIVE ORDER'}
          </Text>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={[styles.hoursText, { color: getStatusColor() }]}>
            {isActive ? 
              `${Math.ceil(timeLeft / 60)} minutes remaining` : 
              'Place an order to start timer'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  card: {
    width: 280,
    padding: 25,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  timeCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    width: '100%',
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
});

export default EnhancedCircularTimer;