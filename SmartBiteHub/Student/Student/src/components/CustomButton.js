import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function CustomButton({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    marginVertical: 5,
    width: '80%',
    alignItems: 'center',
    borderRadius: 5,
  },
  buttonText: { color: '#fff', fontSize: 16 },
});
