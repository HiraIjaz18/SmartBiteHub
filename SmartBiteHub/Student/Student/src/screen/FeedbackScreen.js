import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import SocketService from '../services/socket.js';

const FeedbackScreen = ({ navigation, route }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    comment: ''
  });
  const [wordCount, setWordCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [recentFeedback, setRecentFeedback] = useState([]);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        setSocketStatus('connecting');
        await SocketService.connect();
        setSocketStatus('connected');
      } catch (error) {
        setSocketStatus('error');
        console.error('Socket connection error:', error);
      }
    };

    connectSocket();

    const connectionListeners = {
      connect: () => setSocketStatus('connected'),
      disconnect: () => setSocketStatus('disconnected'),
      connect_error: () => setSocketStatus('error')
    };

    Object.entries(connectionListeners).forEach(([event, handler]) => {
      SocketService.subscribe(event, handler);
    });

    return () => {
      Object.keys(connectionListeners).forEach(event => {
        SocketService.unsubscribe(event);
      });
      SocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!SocketService.isConnected() || !isValidEmail(form.email)) return;

    try {
      SocketService.joinFeedbackRoom();
      const handleNewFeedback = (data) => {
        setRecentFeedback(prev => [data, ...prev.slice(0, 4)]);
      };

      SocketService.subscribe('newFeedback', handleNewFeedback);

      return () => {
        SocketService.unsubscribe('newFeedback', handleNewFeedback);
      };
    } catch (error) {
      console.error('Feedback room error:', error);
    }
  }, [form.email, socketStatus]);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'comment') setWordCount(countWords(value));
  };

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      comment: form.comment.trim()
    };

    if (!Object.values(trimmedForm).every(Boolean)) {
      return Alert.alert('Error', 'Please fill in all fields');
    }
    if (!isValidEmail(trimmedForm.email)) {
      return Alert.alert('Error', 'Invalid email address');
    }
    if (wordCount > 250) {
      return Alert.alert('Error', 'Maximum 250 words allowed');
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://172.21.12.17:4000/api/feedback/givefeedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmedForm),
      });

      if (!response.ok) throw new Error(await response.text());

      setForm({ name: '', email: '', comment: '' });
      setWordCount(0);
      Alert.alert('Success', 'Feedback submitted!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Back arrow */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Share Your Feedback</Text>

      

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={form.name}
          onChangeText={(text) => handleInputChange('name', text)}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={form.email}
          onChangeText={(text) => handleInputChange('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.commentInput}
          placeholder="Write your feedback here (max 250 words)"
          value={form.comment}
          onChangeText={(text) => handleInputChange('comment', text)}
          multiline
          maxLength={1500}
          textAlignVertical="top"
        />

        <Text style={styles.wordCount}>
          {wordCount}/250 words • {1500 - form.comment.length} characters left
        </Text>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Text>
        </TouchableOpacity>

        {recentFeedback.length > 0 && (
          <View style={styles.recentFeedback}>
            <Text style={styles.recentTitle}>Recent Feedback</Text>
            {recentFeedback.map((item, index) => (
              <View key={index} style={styles.feedbackItem}>
                <Text style={styles.feedbackName}>{item.name}</Text>
                <Text style={styles.feedbackComment}>{item.comment}</Text>
                <Text style={styles.feedbackTime}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontSize: 26,
    color: '#8B0000',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
    marginVertical: 20,
    textAlign: 'center',
  },
  connectionStatus: {
    alignItems: 'center',
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    color: '#555',
  },
  connected: {
    color: 'green',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#8B0000',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  commentInput: {
    height: 150,
    backgroundColor: '#fff',
    borderColor: '#8B0000',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wordCount: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#8B0000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recentFeedback: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#8B0000',
  },
  feedbackItem: {
    backgroundColor: '#fff8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#8B0000',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  feedbackName: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#8B0000',
  },
  feedbackComment: {
    marginBottom: 5,
    color: '#333',
  },
  feedbackTime: {
    fontSize: 12,
    color: '#777',
  },
});


export default FeedbackScreen;
