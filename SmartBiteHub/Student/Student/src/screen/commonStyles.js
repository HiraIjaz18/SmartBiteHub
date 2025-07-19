// commonStyles.js
import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#F4F4F9' },
  container: { flex: 1, padding: 20, backgroundColor: '#F4F4F9' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#B24D32', marginBottom: 10, textAlign: 'center' },
  card: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  subtitle: { fontSize: 18, color: '#555', marginBottom: 25, textAlign: 'center' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  price: { fontSize: 18, color: '#777', marginBottom: 6 },
  quantity: { fontSize: 18, color: '#777', marginBottom: 6 },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#28A745', marginBottom: 6 },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#FF9F29', alignItems: 'center', marginTop: 20, marginBottom: 25 },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  loadingText: { fontSize: 20, color: '#FF9F29', textAlign: 'center', marginTop: 50 },
});