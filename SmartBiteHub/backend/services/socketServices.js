import { Server } from 'socket.io';
import FOrder from '../facultyModels/ForderModel.js';
import fBulkOrder from '../facultyModels/FbulkorderModel.js';
import FPreOrder from '../facultyModels/FpreorderModel.js';
import BulkOrder from '../models/bulkorderModel.js';
import PreOrder from '../models/preorderModel.js';
import Order from '../models/orderModel.js';

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT"],
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Helper function to handle order cancellations
    const handleOrderCancellation = async (Model, roomPrefix, event, { orderId, email }, callback) => {
      try {
        const order = await Model.findById(orderId);
        if (!order) return callback({ error: `${event} not found` });
        if (order.email !== email) return callback({ error: 'Unauthorized' });

        order.status = 'Cancelled';
        await order.save();

        // Notify relevant rooms
        io.to(`${roomPrefix}_${orderId}`).emit(`${event}_update`, {
          status: 'Cancelled',
          orderId,
          timestamp: new Date(),
        });

        io.to('admin_dashboard').emit(`${event}_activity`, {
          type: 'cancellation',
          orderId,
          user: email,
          timestamp: new Date(),
        });

        callback({ success: true });
      } catch (error) {
        console.error(`${event} cancellation error:`, error);
        callback({ error: 'Internal server error' });
      }
    };

    // Order Cancellation
    socket.on('order_cancelled', (data, callback) => {
      handleOrderCancellation(FOrder, 'order', 'order', data, callback);
    });

    // Pre-Order Cancellation
    socket.on('pre_order_cancellation', (data, callback) => {
      handleOrderCancellation(FPreOrder, 'pre_order', 'pre_order', data, callback);
    });

    // Bulk Order Cancellation
    socket.on('bulk_order_cancellation', (data, callback) => {
      handleOrderCancellation(fBulkOrder, 'bulk_order', 'bulk_order', data, callback);
    });

    // Student Bulk Order Cancellation
    socket.on('student_bulk_order_cancelled', (data, callback) => {
      handleOrderCancellation(BulkOrder, 'student_bulk_order', 'student_bulk_order', data, callback);
    });

    // Student Pre-Order Cancellation
    socket.on('student_pre_order_cancelled', (data, callback) => {
      handleOrderCancellation(PreOrder, 'student_pre', 'student_pre_order', data, callback);
    });

    // Room Management
    socket.on('joinOrderRoom', ({ orderId, email }, callback) => {
      try {
        socket.join(`order_${orderId}`);
        socket.join(`user_${email}`);
        console.log(`User ${email} joined order room ${orderId}`);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('joinBulkOrderRoom', ({ orderId, email }) => {
      socket.join(`bulk_order_${orderId}`);
      socket.join(`user_${email}`);
      console.log(`User ${email} joined bulk order room ${orderId}`);
    });

    socket.on('joinAdminRoom', () => {
      socket.join('admin_dashboard');
      console.log('Admin joined dashboard room');
    });

    socket.on('joinFeedbackRoom', () => {
      socket.join('feedbackRoom');
      console.log('Client joined feedback room');
    });

    socket.on('subscribeToDeliveries', ({ attendantId }) => {
      socket.join(`attendant_${attendantId}`);
      console.log(`Attendant ${attendantId} subscribed to deliveries`);
    });

    socket.on('subscribeBulkOrderAdmin', () => {
      socket.join('bulk_order_admin');
      console.log('Client subscribed as bulk order admin');
    });

    socket.on('leaveOrderRoom', ({ orderId, email }) => {
      socket.leave(`order_${orderId}`);
      socket.leave(`user_${email}`);
      console.log(`User ${email} left order room ${orderId}`);
    });

    // Disconnection handler
    socket.on('disconnect', (reason) => {
      console.log(`Client ${socket.id} disconnected:`, reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};