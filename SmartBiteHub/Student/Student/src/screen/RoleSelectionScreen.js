import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // For gradient backgrounds
import { Ionicons } from '@expo/vector-icons';
// For icons

const RoleSelectionScreen = ({ navigation }) => {
  const handleRoleSelection = (role) => {
    if (role === 'Faculty') {
      navigation.navigate('FLoginScreen'); // Navigate to FSignup for Faculty
    } else {
      navigation.replace('LoginScreen'); // Navigate to LoginScreen for Student
    }
  };

  return (
    <LinearGradient
      colors={['#FF8C00', '#FFA500']} // Gradient background
      style={styles.container}
    >
      <Text style={styles.title}>Select Your Role</Text>

      {/* Faculty Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => handleRoleSelection('Faculty')}
        accessibilityLabel="Faculty role selection"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#B24D32', '#FF6347']} // Gradient for the button
          style={styles.gradient}
        >
          <Ionicons name="person" size={24} color="#FFF" style={styles.icon} />
          <Text style={styles.buttonText}>Faculty</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Student Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => handleRoleSelection('Student')}
        accessibilityLabel="Student role selection"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#B24D32', '#FF6347']} // Gradient for the button
          style={styles.gradient}
        >
          <Ionicons name="school" size={24} color="#FFF" style={styles.icon} />
          <Text style={styles.buttonText}>Student</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 50,
    color: '#FFF', // White color for the title
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)', // Subtle text shadow
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  button: {
    width: '80%',
    marginBottom: 20,
    borderRadius: 30,
    overflow: 'hidden', // Ensure gradient doesn't overflow
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  gradient: {
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10, // Space between icon and text
  },
  icon: {
    marginRight: 10, // Space between icon and text
  },
});

export default RoleSelectionScreen;