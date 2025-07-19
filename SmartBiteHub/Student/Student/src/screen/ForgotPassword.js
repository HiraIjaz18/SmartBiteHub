import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');

    const handleSendOTP = async () => {
        try {
            const response = await axios.post('http://172.21.12.17:4000/api/forgot/forgot-password', { email });
            if (response.data.success) {
                Alert.alert('Success', 'OTP sent to your email');
                navigation.navigate('ResetPasswordScreen', { email });
            } else {
                Alert.alert('Error', response.data.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to send OTP');
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Forgot Password</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <Button title="Send OTP" onPress={handleSendOTP} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    },
    title: {
        fontSize: 24,
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 16,
        paddingHorizontal: 8,
    },
});

export default ForgotPasswordScreen;