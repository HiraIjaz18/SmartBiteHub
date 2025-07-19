import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  // ScrollView and Container
  scrollView: {
    flex: 1,
    backgroundColor: '#FFF7E6', // Light Yellow Background
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF7E6', // Light Yellow Background
  },

  // Typography
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9F29', // Orange
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 25,
    textAlign: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  price: {
    fontSize: 18,
    color: '#777',
    marginBottom: 6,
  },
  quantity: {
    fontSize: 18,
    color: '#777',
    marginBottom: 6,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28A745', // Green
    marginBottom: 6,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9F29', // Orange
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 25,
  },

  // Cards
  card: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF', // White
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // Buttons
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#FF9F29', // Orange
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF', // White
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Loading State
  loadingText: {
    fontSize: 20,
    color: '#28A745', // Green
    textAlign: 'center',
    marginTop: 50,
  },
});
