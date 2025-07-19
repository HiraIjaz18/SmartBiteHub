import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';

const SplashScreen = ({ navigation }) => {
    const fadeAnim = new Animated.Value(0);
    const translateAnim = new Animated.Value(30); // Adding translate animation for dynamic entry

    useEffect(() => {
        // Fade-in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
        }).start();

        // Translate animation for text
        Animated.timing(translateAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
        }).start();

        // Navigate to RoleSelectionScreen after 3 seconds
        setTimeout(() => {
            navigation.replace('RoleSelectionScreen');
        }, 3000);
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
            <Animated.Text style={[styles.splashText, { transform: [{ translateY: translateAnim }] }]}>
                Welcome to Smart Bite Hub
            </Animated.Text>
            <Text style={styles.tagline}>Where Convenience Meets Flavor</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7B538', // Mustard yellow background
    },
    logo: {
        width: 150,
        height: 150,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    splashText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        letterSpacing: 2,
        marginTop: 10,
    },
    tagline: {
        fontSize: 18,
        color: '#FFF',
        marginTop: 10,
        fontStyle: 'italic',
        letterSpacing: 1,
    },
});

export default SplashScreen;