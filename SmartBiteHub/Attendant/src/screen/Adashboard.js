import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Adashboard = ({ navigation }) => {
  return (
    <LinearGradient
      colors={['#FFFFFF', '#F5F5DC']} // Light warm gradient for a clean look
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome, Attendant!</Text>
          <Text style={styles.subtitle}>Manage your tasks efficiently</Text>
        </View>

        {/* Regular Orders Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#FFA500' }]} // Yellow-Orange
          onPress={() => navigation.navigate('AttOrders')}
        >
          <MaterialIcons name="assignment" size={30} color="#FFFFFF" />
          <Text style={styles.cardTitle}>Regular Orders</Text>
          <Text style={styles.cardText}>View and manage all regular orders</Text>
        </TouchableOpacity>

        {/* Pre-Orders Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#98FB98' }]} // Pale Green
          onPress={() => navigation.navigate('Apreorder')}
        >
          <MaterialIcons name="event-note" size={30} color="#FFFFFF" />
          <Text style={styles.cardTitle}>Pre-Orders</Text>
          <Text style={styles.cardText}>Manage pre-orders for tomorrow</Text>
        </TouchableOpacity>

        {/* Bulk Orders Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#FFD700' }]} // Gold
          onPress={() => navigation.navigate('Abulkorder')}
        >
          <MaterialIcons name="shopping-cart" size={30} color="#FFFFFF" />
          <Text style={styles.cardTitle}>Bulk Orders</Text>
          <Text style={styles.cardText}>Handle bulk orders efficiently</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333', // Dark text for contrast
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
  },
  card: {
    width: '90%',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
  },
  cardText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default Adashboard;
