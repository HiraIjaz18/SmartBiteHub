import Order from '../models/orderModel.js';
import RegularItem from '../models/regularMenuModel.js';
import { calculateTimer } from '../utils/timer.js';

// Create an Order (for Faculty)
export const createFacultyOrder = async (req, res) => {
  const { itemId, itemType, quantity, totalPrice, orderDate, jwtToken } = req.body;

  let item;
  try {
    if (itemType === 'RegularItem') {
      item = await RegularItem.findById(itemId);
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const timer = calculateTimer();
    if (!timer.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Orders can only be placed between 8:15 AM and 3:45 PM.',
      });
    }

    const order = new Order({
      itemName: item.name,
      itemType,
      quantity,
      totalPrice,
      orderDate,
      jwtToken,
    });

    await order.save();
    res.json({
      success: true,
      message: 'Order created successfully',
      order,
      remainingTime: timer.remainingTime, // Time left in the current interval
    });
  } catch (error) {
    console.error('Error creating faculty order:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error });
  }
};

// List Orders (for Faculty)
export const listFacultyOrders = async (req, res) => {
  try {
    const timer = calculateTimer();

    if (!timer.isActive) {
      return res.status(200).json({ success: true, data: [], message: 'No orders during off-hours.' });
    }

    const orders = await Order.find({ jwtToken: req.body.jwtToken }).sort({ createdAt: 1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error retrieving faculty orders:', error);
    res.status(500).json({ success: false, message: 'Error retrieving orders', error });
  }
};

// Update Order Status (for Faculty)
export const updateFacultyOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating faculty order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status', error });
  }
};

// Get Specific Order Details (for Faculty)
export const getFacultyOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error retrieving faculty order details:', error);
    res.status(500).json({ success: false, message: 'Error retrieving order details', error });
  }
};
