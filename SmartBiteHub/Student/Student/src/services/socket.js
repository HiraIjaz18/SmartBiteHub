import io from 'socket.io-client';

class SocketService {
  constructor() {
    if (!SocketService.instance) {
      this.socket = null;
      this.eventListeners = new Map();
      this.connectionState = 'disconnected';
      this.pendingOperations = [];
      this.url = 'http://172.21.12.17:4000';
      this.connectionPromise = null;
      this.retryCount = 0;
      this.maxRetries = 100;
      SocketService.instance = this;
    }
    return SocketService.instance;
  }

  // Connection Management
  connect = async () => {
    if (this.connectionState === 'connected') return true;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionState = 'connecting';
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
        }

        this.socket = io(this.url, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: this.maxRetries,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 15000,
          autoConnect: true,
          forceNew: true
        });

        // Connection established
        this.socket.on('connect', () => {
          this.connectionState = 'connected';
          this.retryCount = 0;
          this.processPendingOperations();
          resolve(true);
        });

        // Connection error
        this.socket.on('connect_error', (err) => {
          this.connectionState = 'error';
          this.retryCount++;
          if (this.retryCount >= this.maxRetries) {
            reject(new Error(`Connection failed after ${this.maxRetries} attempts`));
          }
        });

        // Disconnected
        this.socket.on('disconnect', (reason) => {
          if (reason === 'io server disconnect') {
            this.socket.connect();
          }
          this.connectionState = 'disconnected';
        });

        // Reconnect attempt
        this.socket.on('reconnect_attempt', (attempt) => {
          console.log(`Reconnection attempt ${attempt}`);
        });

        // Reconnect failed
        this.socket.on('reconnect_failed', () => {
          this.connectionState = 'error';
          reject(new Error('Reconnection failed'));
        });

      } catch (error) {
        this.connectionState = 'error';
        reject(error);
      }
    });

    return this.connectionPromise;
  };

  // Room Management - EXACTLY AS YOU HAD IT
  async joinOrderRoom(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('joinOrderRoom', { orderId, email }, (response) => {
        response?.error ? reject(new Error(response.error)) : resolve(response);
      });
    });
  }

   joinBulkOrderRoom = (orderId, email) => {
    if (!this.isConnected) {
      this.pendingOperations.push(() => this.joinBulkOrderRoom(orderId, email));
      return;
    }
    this.socket.emit('joinBulkOrderRoom', { orderId, email });
  };

  subscribeToBulkOrderUpdates = (orderId, callback) => {
    const eventName = `bulk_order_update_${orderId}`;
    this.socket.on(eventName, callback);
  };

  unsubscribeFromBulkOrderUpdates = (orderId) => {
    const eventName = `bulk_order_update_${orderId}`;
    this.socket.off(eventName);
  };


  async joinAdminRoom() {
    await this.connect();
    this.socket.emit('joinAdminRoom');
  }

  async joinFeedbackRoom() {
    await this.connect();
    this.socket.emit('joinFeedbackRoom');
  }

  async subscribeToDeliveries(attendantId) {
    await this.connect();
    this.socket.emit('subscribeToDeliveries', { attendantId });
  }

  async subscribeToBulkOrderAdmin() {
    await this.connect();
    this.socket.emit('subscribeBulkOrderAdmin');
  }

  async leaveOrderRoom(orderId, email) {
    await this.connect();
    this.socket.emit('leaveOrderRoom', { orderId, email });
  }
  async emitOrderCancellation(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('order_cancelled', { orderId, email }, (response) => {
        response?.error ? reject(new Error(response.error)) : resolve(response);
      });
    });
  }
  async emitPreOrderCancellation(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('pre_order_cancellation', { orderId, email }, (response) => {
        response?.error ? reject(new Error(response.error)) : resolve(response);
      });
    });
  }
  async emitBulkOrderCancellation(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('bulk_order_cancellation', { orderId, email }, (response) => {
        response?.error ? reject(new Error(response.error)) : resolve(response);
      });
    });
  }async joinStudentOrderRoom(orderId, email) {
    console.log(`[SOCKET] Attempting to join room ${orderId}`);
    
    // Ensure fresh connection
    if(this.socket?.connected) {
      console.log('[SOCKET] Reusing existing connection');
    } else {
      console.log('[SOCKET] Establishing new connection');
      await this.connect();
    }
  
    return new Promise((resolve, reject) => {
      console.log(`[SOCKET] Emitting join event`);
      this.socket.emit('joinStudentOrderRoom', { orderId, email }, (response) => {
        if(response?.success) {
          console.log(`[SOCKET] Joined room ${orderId} successfully`);
          resolve(response);
        } else {
          console.error(`[SOCKET] Join failed: ${response?.error}`);
          reject(response?.error || 'Join failed');
        }
      });
    });
  }
async leaveStudentOrderRoom(orderId, email) {
  await this.connect();
  return new Promise((resolve, reject) => {
    this.socket.emit('leaveStudentOrderRoom', { orderId, email }, (response) => {
      response?.error ? reject(new Error(response.error)) : resolve(response);
    });
  });
}

  async emitStudentOrderConfirmed(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('student_order_confirmed', { orderId, email }, (response) => {
        response?.error ? reject(new Error(response.error)) : resolve(response);
      });
    });
  }
  
  async emitStudentOrderError(orderId, error) {
    await this.connect();
    this.socket.emit('student_order_error', { orderId, error });
  }

  

  // Student Order Actions
  async emitStudentOrderCancellation(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('student_order_cancelled', { orderId, email }, (response) => {
        response?.error ? reject(new Error(response.error)) : resolve(response);
      });
    });
  }

  // Student Subscription Management
  subscribeToStudentOrderUpdates(orderId, callback) {
    const handler = (data) => {
      if (data.orderId === orderId) {
        callback(data);
      }
    };
    this.socket.on('student_order_update', handler);
    this.eventListeners.set(`student_order_update_${orderId}`, handler);
  }
  
  unsubscribeFromStudentOrderUpdates(orderId) {
    const eventKey = `student_order_update_${orderId}`;
    const handler = this.eventListeners.get(eventKey);
    if (handler) {
      this.socket.off('student_order_update', handler);
      this.eventListeners.delete(eventKey);
    }
  }
  // Student Delivery Tracking
  async subscribeToStudentDeliveries(studentId) {
    await this.connect();
    this.socket.emit('student_subscribe_deliveries', { studentId });
  }

  async joinStudentBulkOrderRoom(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('student_joinBulkOrderRoom', 
        { orderId, email }, 
        (response) => {
          response?.error ? reject(response.error) : resolve(response);
        }
      );
    });
  }
  
  // Updated cancellation emitter
  async emitStudentBulkOrderCancellation(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('student_bulk_order_cancelled', 
        { orderId, email }, 
        (response) => {
          response?.error ? reject(response.error) : resolve(response);
        }
      );
    });
  }
  
  // Updated subscription method
  subscribeToStudentBulkOrderUpdates(orderId, callback) {
    const handler = (data) => {
      if (data.orderId === orderId) {
        callback(data);
      }
    };
    this.socket.on('student_bulk_order_update', handler);
    this.eventListeners.set(`student_bulk_update_${orderId}`, handler);
  }
  unsubscribeFromStudentBulkOrderUpdates(orderId) {
    const eventKey = `student_bulk_order_update_${orderId}`;
    const handler = this.eventListeners.get(eventKey);
    if (handler) {
      this.socket.off('student_bulk_order_update', handler);
      this.eventListeners.delete(eventKey);
    }
  }

  async subscribeToStudentBulkAdmin() {
    await this.connect();
    this.socket.emit('student_subscribe_bulk_admin');
  }
  async joinStudentPreOrderRoom(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('student_joinPreOrderRoom', { orderId, email }, (response) => {
        response?.error ? reject(new Error(response.error)) : resolve(response);
      });
    });
  }
  
  subscribeToStudentPreOrderUpdates(orderId, callback) {
    const handler = (data) => {
      if (data.orderId === orderId) {
        callback(data);
      }
    };
    this.socket.on('student_pre_order_update', handler);
    this.eventListeners.set(`student_pre_${orderId}`, handler);
  }
  
  async emitStudentPreOrderCancellation(orderId, email) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.socket.emit('student_pre_order_cancelled', { orderId, email }, (response) => {
        response?.error ? reject(new Error(response.error)) : resolve(response);
      });
    });
  }
  // Event Management
  subscribe(event, callback) {
    const listener = (data) => {
      if (!this.isConnected()) {
        this.pendingOperations.push(() => callback(data));
        return;
      }
      callback(data);
    };
    
    this.socket?.on(event, listener);
    this.eventListeners.set(event, listener);
  }

  unsubscribe(event) {
    const listener = this.eventListeners.get(event);
    if (listener) {
      this.socket?.off(event, listener);
      this.eventListeners.delete(event);
    }
  }

  // Utility Methods
  isConnected() {
    return this.connectionState === 'connected' && this.socket?.connected;
  }
  processPendingOperations() {
    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      try {
        operation();
      } catch (error) {
        console.error('Error processing pending operation:', error);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.connectionState = 'disconnected';
    this.eventListeners.clear();
    this.connectionPromise = null;
    this.pendingOperations = [];
    this.retryCount = 0;
  }

  // Status Monitoring
  getConnectionState() {
    return this.connectionState;
  }
}

const instance = new SocketService();
export default instance;