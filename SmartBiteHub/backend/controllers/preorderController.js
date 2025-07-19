import crypto from 'crypto';
import PreOrder from '../models/preorderModel.js' // Import PreOrder model
import SpecialItem from '../models/specialMenuModel.js'; // Import SpecialItem model
import { getIO } from '../services/socketServices.js'; // Import socket.io instance
// Create a Pre-Order
// controllers/preorderController.js
export const createPreOrder = async (req, res) => {
  try {
    const { items, totalPrice, email } = req.body; // Destructure email
      const hexCode = crypto.randomBytes(16).toString('hex');
    const newOrder = new PreOrder({
      items: items.map(item => ({
        itemName: item.itemName,
        itemType: item.itemType,
        quantity: item.quantity,
        itemPrice: item.itemPrice
      })),
      totalPrice,
      email, // Store email directly
      orderDate: new Date(),
      status: 'Pending',
      token: hexCode,
    });

    const savedOrder = await newOrder.save();
    
    // Notify admin dashboard
    const io = getIO();
    io.to('admin_dashboard').emit('new_student_pre_order', savedOrder);

    res.status(201).json({
      success: true,
      order: savedOrder
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const updatePreOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await PreOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    const io = getIO();
    io.to(`student_pre_${id}`).emit('student_pre_order_update', {
      status,
      orderId: id,
      timestamp: new Date()
    });

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Get All Pre-Orders
export const getAllPreOrders = async (req, res) => {
  try {
    const orders = await PreOrder.find().populate('userId', 'name email'); // Populate user details
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pre-orders', details: error.message });
  }
};

// Get Pre-Order by ID
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await PreOrder.findById(orderId); // Changed from Order to PreOrder

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error retrieving order details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving order details', 
      error: error.message 
    });
  }
};


// Get Daily Pre-Orders (4 PM to 4 PM window)
export const getDailyPreOrders = async (req, res) => {
  try {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    // Calculate time boundaries
    const yesterday4PM = new Date(todayUTC);
    yesterday4PM.setUTCDate(todayUTC.getUTCDate() - 1);
    yesterday4PM.setUTCHours(16, 0, 0, 0); // 4 PM yesterday (UTC)

    const dayBeforeYesterday4PM = new Date(yesterday4PM);
    dayBeforeYesterday4PM.setUTCDate(yesterday4PM.getUTCDate() - 1);

    // Find pre-orders within the 4 PM to 4 PM window
    const dailyPreOrders = await PreOrder.find({
      orderDate: {
        $gte: dayBeforeYesterday4PM,
        $lte: yesterday4PM
      }
    })
    .populate('userId', 'name email') // Populate user details
    .sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      message: `Found ${dailyPreOrders.length} pre-orders for today's fulfillment`,
      data: {
        fulfillmentDate: todayUTC.toISOString().split('T')[0],
        cutoffWindow: {
          start: dayBeforeYesterday4PM.toISOString(),
          end: yesterday4PM.toISOString()
        },
        orders: dailyPreOrders
      }
    });

  } catch (error) {
    console.error('Error fetching daily pre-orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily pre-orders',
      details: error.message
    });
  }
};

