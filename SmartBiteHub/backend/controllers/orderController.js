import Order from '../models/orderModel.js';
import RegularItem from '../models/regularMenuModel.js';
import crypto from 'crypto';
import walletModel from '../models/walletModel.js';
import mongoose from 'mongoose';
import DailyItem from '../models/dailyMenuModel.js';
import { getIO } from '../services/socketServices.js'; // Import socket.io instance

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;
const VALID_STATUSES = ['Pending', 'Completed', 'Cancelled'];
const USER_TYPES = ['student', 'regular'];

// Validation helpers
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validateOrderInput = (body) => {
  const errors = [];
  
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.push('Invalid or empty items array');
  } else {
    body.items.forEach((item, index) => {
      if (!item.itemName || typeof item.itemName !== 'string') {
        errors.push(`Item ${index + 1}: Missing or invalid itemName`);
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        errors.push(`Item ${index + 1}: Quantity must be a number greater than 0`);
      }
      if (!item.price || typeof item.price !== 'number' || item.price < 0) {
        errors.push(`Item ${index + 1}: Price must be a positive number`);
      }
    });
  }

  if (!body.totalPrice || typeof body.totalPrice !== 'number' || body.totalPrice < 0) {
    errors.push('Invalid totalPrice');
  }

  if (!body.email || !validateEmail(body.email)) {
    errors.push('Invalid email address');
  }

  if (!body.userType || !USER_TYPES.includes(body.userType)) {
    errors.push(`Invalid userType. Allowed values: ${USER_TYPES.join(', ')}`);
  }

  return errors;
};

export const createOrder = async (req, res) => {
  // Manual validation
  const validationErrors = validateOrderInput(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }

  let retries = 0;
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    const { items, totalPrice, email, userType } = req.body;
    const inventoryUpdates = []; 

    // Wallet check
    const wallet = await walletModel.findOne({ email }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (wallet.balance < totalPrice) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        currentBalance: wallet.balance
      });
    }

    for (const orderItem of items) {
      let menuItem = await DailyItem.findOne({ name: orderItem.itemName }).session(session);
      let itemType = 'Daily';
      
      if (!menuItem) {
        menuItem = await RegularItem.findOne({ name: orderItem.itemName }).session(session);
        itemType = 'Regular';
      }

      if (!menuItem) {
        throw new Error(`${orderItem.itemName} not found in inventory`);
      }

      if (menuItem.quantity < orderItem.quantity) {
        throw new Error(`${orderItem.itemName} has insufficient quantity`);
      }

      // Update inventory
      menuItem.quantity -= orderItem.quantity;
      await menuItem.save({ session });
      inventoryUpdates.push({
        name: orderItem.itemName,
        quantity: menuItem.quantity
      });

      // Assign itemType to the orderItem
      orderItem.itemType = itemType;
    }

    // Deduct balance
    wallet.balance -= totalPrice;
    await wallet.save({ session });

    // Create order
    const hexCode = crypto.randomBytes(16).toString('hex');
    const order = new Order({
      items,
      totalPrice,
      orderDate: new Date(),
      status: 'Pending',
      token: hexCode,
      email,
      userType
    });

    await order.save({ session });
    await session.commitTransaction();

    // Real-time updates
    const io = getIO();
    const userRoom = `${userType}_${email}`;
    const adminEvent = `${userType}_order`;

    io.to('admin_dashboard').emit(adminEvent, {
      _id: order._id,
      status: 'Pending',
      totalPrice,
      email,
      items: items.map(item => ({
        name: item.itemName, 
        quantity: item.quantity
      }))
    });

    io.to(userRoom).emit('order_created', {
      orderId: order._id,
      totalPrice,
      status: 'Pending',
      token: hexCode
    });

    return res.status(201).json({
      success: true,
      message: 'Order created',
      orderId: order._id,
      token: hexCode,
      newBalance: wallet.balance,
      inventory: inventoryUpdates.map(i => ({
        item: i.name,
        remaining: i.quantity
      }))
    });

  } catch (error) {
    await session.abortTransaction();
    
    if (error.errorLabels?.includes('TransientTransactionError') && retries < MAX_RETRIES) {
      retries++;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
      return createOrder(req, res);
    }

    console.error('Order Error:', {
      endpoint: req.originalUrl,
      user: req.body.email,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: error.message.includes('unavailable') 
        ? error.message 
        : 'Order processing failed',
      retriesAttempted: retries
    });
  } finally {
    session.endSession();
  }
};
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`
    });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    const io = getIO();
    const userRoom = `${order.userType}_${order.email}`;

    io.to('admin_dashboard').emit('order_update', {
      orderId: order._id,
      status: order.status,
      updatedAt: order.updatedAt
    });

    io.to(userRoom).emit('order_status_update', {
      orderId: order._id,
      newStatus: status,
      updateTime: new Date()
    });

    return res.json({
      success: true,
      message: 'Order status updated',
      data: {
        orderId: order._id,
        previousStatus: order.status,
        newStatus: status
      }
    });

  } catch (error) {
    console.error('Status Update Error:', {
      params: req.params,
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
};

// List Orders
export const listOrders = async (req, res) => {
  try {
    const orders = await Order.find({});
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error retrieving orders:', error);
    res.status(500).json({ success: false, message: 'Error retrieving orders', error });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { email } = req.user;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      email
    }).select('-__v -token');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    return res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Order Details Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order details'
    });
  }
};
// Get Daily Orders (8 AM to 4 PM UTC window)
export const getDailyOrders = async (req, res) => {
  try {
    const now = new Date();
    
    // Calculate today's boundaries in UTC
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    // Set time window (8:00 AM to 4:00 PM UTC)
    const startTime = new Date(todayUTC);
    startTime.setUTCHours(8, 0, 0, 0); // 8 AM UTC

    const endTime = new Date(todayUTC);
    endTime.setUTCHours(16, 0, 0, 0); // 4 PM UTC

    // Find orders within the daily window
    const dailyOrders = await Order.find({
      orderDate: {
        $gte: startTime,
        $lte: endTime
      }
    }).sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      message: `Found ${dailyOrders.length} orders between ${startTime.toISOString()} and ${endTime.toISOString()}`,
      data: {
        reportDate: todayUTC.toISOString().split('T')[0],
        timeWindow: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        },
        orders: dailyOrders
      }
    });

  } catch (error) {
    console.error('Error fetching daily orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily orders',
      details: error.message
    });
  }
};