import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

const ResetPasswordScreen = ({ route, navigation }) => {
    const { email } = route.params;
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const handleResetPassword = async () => {
        try {
            const response = await axios.post('http://172.21.12.17:4000/api/forgot/reset-password', {
                email,
                otp,
                newPassword,
            });
            if (response.data.success) {
                Alert.alert('Success', 'Password reset successfully');
                navigation.navigate('LoginScreen'); // Navigate to login screen
            } else {
                Alert.alert('Error', response.data.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to reset password');
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Reset Password</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
            />
            <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
            />
            <Button title="Reset Password" onPress={handleResetPassword} />
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

export default ResetPasswordScreen;