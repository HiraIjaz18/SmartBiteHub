import crypto from 'crypto';
import BulkOrder from '../models/bulkorderModel.js';
import RegularItem from '../models/regularMenuModel.js';
import SpecialItem from '../models/specialMenuModel.js';
import { getIO } from '../services/socketServices.js'; // Import socket instance

// Create Bulk Order with Socket Integration
export const createBulkOrder = async (req, res) => {
  try {
    const { items, orderDate, email } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must include items' });
    }

    if (items.some(item => item.quantity < 6)) {
      return res.status(400).json({ error: 'Minimum 6 quantities per item' });
    }

    const parsedDate = new Date(orderDate);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Calculate total price
    let totalPrice = 0;
    for (const item of items) {
      let menuItem;
      if (item.itemType.includes('Regular')) {
        menuItem = await RegularItem.findOne({ name: item.itemName });
      } else {
        menuItem = await SpecialItem.findOne({ name: item.itemName });
      }
      
      if (!menuItem) {
        return res.status(404).json({ error: `Item ${item.itemName} not found` });
      }
      totalPrice += item.quantity * menuItem.price;
    }
  const hexCode = crypto.randomBytes(16).toString('hex');
    // Create order
    const newOrder = new BulkOrder({
      items,
      totalPrice,
      orderDate: parsedDate,
      status: 'Pending',
      email,
      token: hexCode,
    });

    const savedOrder = await newOrder.save();
    const io = getIO();

    // Socket emit to admin dashboard
    io.to('admin_dashboard').emit('new_bulk_order', {
      type: 'new_order',
      order: savedOrder,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Bulk order created!',
      order: savedOrder
    });

  } catch (error) {
    console.error('Bulk order error:', error);
    res.status(500).json({ error: 'Server error creating order' });
  }
};

// Update Order Status with Socket Integration
export const updateBulkOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedOrder = await BulkOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const io = getIO();
    
    // Notify user room and admin
    io.to(`bulk_${id}`).emit('bulk_order_update', {
      status,
      orderId: id,
      timestamp: new Date()
    });

    io.to('admin_dashboard').emit('bulk_order_activity', {
      type: 'status_update',
      orderId: id,
      status,
      timestamp: new Date()
    });

    res.json({ success: true, order: updatedOrder });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Server error updating order' });
  }
};

// Get Order Details
export const getOrderDetails = async (req, res) => {
  try {
    const order = await BulkOrder.findById(req.params.orderId)
      .populate('items.itemId', 'name price');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Order details error:', error);
    res.status(500).json({ error: 'Server error fetching order' });
  }
};
export const getDailyBulkOrders = async (req, res) => {
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
    dayBeforeYesterday4PM.setUTCDate(yesterday4PM.getUTCDate() - 1); // 4 PM two days ago (UTC)

    // Find orders between 4 PM (day before yesterday) and 4 PM (yesterday)
    const dailyOrders = await BulkOrder.find({
      orderDate: {
        $gte: dayBeforeYesterday4PM,
        $lte: yesterday4PM
      }
    }).sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      message: `Found ${dailyOrders.length} orders placed between ${dayBeforeYesterday4PM.toISOString()} and ${yesterday4PM.toISOString()}`,
      data: {
        deliveryDate: todayUTC.toISOString().split('T')[0],
        orders: dailyOrders
      }
    });

  } catch (error) {
    console.error('Error fetching daily bulk orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily bulk orders',
      details: error.message
    });
  }
};