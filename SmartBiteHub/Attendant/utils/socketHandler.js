import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.100.6:4000'; // Use your backend URL
let socket = null;

export const initSocket = (token, attendantId) => {
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    extraHeaders: {
      "x-platform": "mobile-attendant",
      "x-attendant-id": attendantId
    }
  });
  return socket;
};

export const getSocket = () => socket;

export const subscribeToOrders = (callback) => {
  if (!socket) return;

  // Existing order subscriptions
  socket.on('orderCreated', (order) => callback('created', order));
  socket.on('orderUpdated', (order) => callback('updated', order));
  socket.on('orderRemoved', (id) => callback('removed', id));
  
  // Delivery notification subscriptions
  socket.on('deliveryReminder', (data) => {
    const deliveryTime = new Date(`${data.deliveryDate}T${data.deliveryTime}`);
    callback('reminder', {
      ...data,
      message: `Delivery to ${data.roomNumber} in 10 minutes (at ${deliveryTime.toLocaleTimeString()})`
    });
  });

  socket.on('deliveryTime', (data) => {
    callback('time', {
      ...data,
      message: `Time to deliver to ${data.roomNumber}`
    });
  });
};

export const unsubscribeFromOrders = () => {
  if (!socket) return;
  socket.off('orderCreated');
  socket.off('orderUpdated');
  socket.off('orderRemoved');
  socket.off('deliveryReminder');
  socket.off('deliveryTime');
};