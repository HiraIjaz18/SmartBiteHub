import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const WalletBalance = ({ navigation }) => {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Function to fetch wallet balance
        const fetchWalletBalance = async () => {
            try {
                // Replace 'Vareesha@gmail.com' with dynamic logged-in user's email
                const email = 'Vareesha@gmail.com';
                const response = await fetch(`http://172.21.12.246:4000/api/wallets/balance?email=${email}`);

                const data = await response.json();

                if (data.success) {
                    setBalance(data.balance); // Update state with fetched balance
                } else {
                    alert(data.message); // Display error message if API fails
                }
            } catch (error) {
                console.error('Error fetching wallet balance:', error);
                alert('Error fetching wallet balance');
            } finally {
                setLoading(false); // Set loading state to false after fetch is complete
            }
        };

        // Call the function to fetch wallet balance
        fetchWalletBalance();
    }, []);

    // Display loading state while data is being fetched
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF9F29" />
                <Text style={styles.loadingText}>Loading wallet balance...</Text>
            </View>
        );
    }

    return (
        <LinearGradient colors={['#FF6F61', '#FFD166']} style={styles.container}>
            <View style={styles.content}>
                {/* Display wallet balance */}
                <Text style={styles.balanceText}>
                    {balance.toFixed(2)} USD
                </Text>

                {/* Button to navigate to main menu */}
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF9F29' }]}
                    onPress={() => navigation.navigate('MainMenuScreen')}
                >
                    <Text style={styles.buttonText}>Back to Menu</Text>
                </TouchableOpacity>

                {/* Button to navigate to wallet details screen */}
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF5733' }]}
                    onPress={() => navigation.navigate('WalletScreen')}
                >
                    <Text style={styles.buttonText}>View Wallet Details</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '90%',
        alignItems: 'center',
    },
    balanceText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 40,
    },
    button: {
        width: '100%',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F4F9',
    },
    loadingText: {
        fontSize: 18,
        color: '#FF9F29',
        marginTop: 20,
    },
});

export default WalletBalance;