import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

const Timer = ({ onTimerEnd }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  // Function to calculate the time until the next interval within 8:30 AM to 3:50 PM
  const getTimeUntilNextInterval = () => {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(24, 0, 0, 0); // Start time: 8:30 AM

    const endTime = new Date(now);
    endTime.setHours(24, 50, 0, 0); // End time: 3:50 PM

    // If the current time is before 8:30 AM, set the start time to today's 8:30 AM
    if (now < startTime) {
      return startTime - now;
    }

    // If the current time is after 3:50 PM, set the start time to tomorrow's 8:30 AM
    if (now > endTime) {
      startTime.setDate(startTime.getDate() + 1);
      return startTime - now;
    }

    // Calculate the next 45-minute interval within the 8:30 AM to 3:50 PM window
    const elapsedTime = now - startTime;
    const interval = 10 * 60 * 1000; // 10 minutes in milliseconds
    const nextInterval = Math.ceil(elapsedTime / interval) * interval;
    return nextInterval - elapsedTime;
  };

  // Start the timer
  useEffect(() => {
    const initialTimeLeft = getTimeUntilNextInterval();
    setTimeLeft(initialTimeLeft);

    const id = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 0) {
          onTimerEnd(); // Trigger the timer end callback
          return getTimeUntilNextInterval(); // Reset the timer for the next interval
        }
        return prevTime - 1000; // Decrease by 1 second
      });
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(id);
  }, [onTimerEnd]);

  // Format the time left into HH:MM:SS
  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerLabel}>Next Order Window In:</Text>
      <View style={styles.timerDisplay}>
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 16,
    color: '#333', // Dark Gray
    marginBottom: 10,
    fontWeight: '500',
  },
  timerDisplay: {
    backgroundColor: '#FFFFFF', // White
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FF9F29', // Orange Border
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745', // Green
    textAlign: 'center',
  },
});

export default Timer;
