import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';

const FSignup = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [wing, setWing] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');

  // Utility function for email validation
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Validation checks
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return;
    }
  
    if (name.length < 3) {
      Alert.alert('Validation Error', 'Name must be at least 3 characters long.');
      return;
    }
  
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required.');
      return;
    }
  
    if (!isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
  
    if (!password.trim()) {
      Alert.alert('Validation Error', 'Password is required.');
      return;
    }
  
    if (password.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters long.');
      return;
    }
  
    if (!wing.trim() || !roomNumber.trim() || !floor.trim()) {
      Alert.alert('Validation Error', 'Complete address details (Wing, Room Number, Floor) are required.');
      return;
    }
  
    try {
      // Backend API call for registration
      const response = await fetch('http://172.21.12.246:4000/api/faculty/Fregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          wing,
          roomNumber,
          floor,
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        Alert.alert('Success', 'Account created successfully.');
        navigation.replace('LoginScreen'); // Navigate to LoginScreen after success
      } else if (data.message === 'User already exists') {
        Alert.alert('Error', 'User already exists.');
      } else {
        Alert.alert('Error', data.message || 'Something went wrong.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Unable to register. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfWidth]}
          placeholder="Wing"
          value={wing}
          onChangeText={setWing}
        />
        <TextInput
          style={[styles.input, styles.halfWidth]}
          placeholder="Room Number"
          value={roomNumber}
          onChangeText={setRoomNumber}
        />
        <TextInput
          style={[styles.input, styles.halfWidth]}
          placeholder="Floor"
          value={floor}
          onChangeText={setFloor}
        />
      </View>

      <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('FLoginScreen')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: '#B24D32',
    padding: 10,
    borderRadius: 5,
    marginTop: 35,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#B24D32',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#B24D32',
    fontSize: 16,
    color: '#6E7D4B',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '30%',
  },
  signupButton: {
    width: '100%',
    backgroundColor: '#F7B538',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#6E7D4B',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
});

export default FSignup;
