import crypto from 'crypto';
import mongoose from 'mongoose';
import fBulkOrder from '../facultyModels/FbulkorderModel.js';
import RegularItem from '../models/regularMenuModel.js';
import SpecialItem from '../models/specialMenuModel.js';
import { getIO } from '../services/socketServices.js';

// Middleware for validating MongoDB IDs
export const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  next();
};

// Create Bulk Order
export const createBulkOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { items, orderDate, wing, floor, roomNumber, email } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Order must include at least one valid item.');
    }

    const invalidItem = items.find(item => item.quantity < 6);
    if (invalidItem) {
      throw new Error(`Minimum 6 quantities required for ${invalidItem.itemName}`);
    }

    // Process items
    let totalPrice = 0;
    const inventoryUpdates = [];
    const orderItems = [];

    for (const item of items) {
      const Model = item.itemType === 'Regular' ? RegularItem : SpecialItem;
      const menuItem = await Model.findOne({ name: item.itemName }).session(session);
      
      if (!menuItem) throw new Error(`Item not found: ${item.itemName}`);
      if (menuItem.quantityAvailable < item.quantity) {
        throw new Error(`Insufficient stock for ${item.itemName} (Available: ${menuItem.quantityAvailable})`);
      }

      totalPrice += item.quantity * menuItem.price;
      inventoryUpdates.push({
        model: Model,
        filter: { name: item.itemName },
        update: { $inc: { quantityAvailable: -item.quantity } }
      });

      orderItems.push({
        itemName: item.itemName,
        itemType: item.itemType,
        quantity: item.quantity,
        itemPrice: menuItem.price
      });
    }

    // Update inventory
    await Promise.all(inventoryUpdates.map(({ model, filter, update }) => 
      model.updateOne(filter, update).session(session)
    ));

    // Create order
    const orderToken = crypto.randomBytes(16).toString('hex');
    const newBulkOrder = new fBulkOrder({
      items: orderItems,
      totalPrice,
      orderDate: new Date(orderDate),
      pickupDate: new Date(orderDate),
      status: 'Pending',
      token: orderToken,
      wing,
      floor,
      roomNumber,
      email: email,
      serverTimestamp: new Date(),
    });

    const savedOrder = await newBulkOrder.save({ session });
    await session.commitTransaction();

    // Notify admin dashboard
    getIO().to('admin_dashboard').emit('new_bulk_order', savedOrder);
    
    res.status(201).json({
      success: true,
      message: 'Bulk order created successfully!',
      order: savedOrder,
      token: orderToken
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Order creation error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Invalid') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get All Orders
export const getAllBulkOrders = async (req, res) => {
  try {
    const orders = await fBulkOrder.find()
      .sort({ orderDate: -1 })
      .populate('userId', 'name email');

    res.status(200).json({ 
      success: true,
      count: orders.length,
      data: orders 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch orders: ' + error.message 
    });
  }
};

// Get Single Order
export const getOrderDetails = async (req, res) => {
  try {
    const order = await fBulkOrder.findById(req.params.orderId)
      .populate('userId', 'name email phone');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    res.json({ 
      success: true, 
      data: order 
    });
  } catch (error) {
    console.error('Order details error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error: ' + error.message 
    });
  }
};

// Confirm Order
export const confirmOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await fBulkOrder.findById(req.params.orderId).session(session);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Order already ${order.status}`
      });
    }

    order.status = 'Confirmed';
    order.confirmedAt = new Date();
    const confirmedOrder = await order.save({ session });
    
    await session.commitTransaction();

    // Notify users and admin
    getIO().to('admin_dashboard').emit('order_update', confirmedOrder);
    getIO().to(order.userId.toString()).emit('order_status', confirmedOrder);

    res.json({
      success: true,
      data: confirmedOrder
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Confirmation failed: ' + error.message
    });
  } finally {
    session.endSession();
  }
};