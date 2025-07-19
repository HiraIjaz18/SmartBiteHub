import Order from '../models/orderModel.js';
import RegularItem from '../models/regularMenuModel.js';

// List All Orders for Chef
export const listChefOrders = async (req, res) => {
  try {
    // Fetch all orders that are either "Pending" or "In Progress"
    const orders = await Order.find({ status: { $in: ['Pending', 'In Progress'] } }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error retrieving chef orders:', error);
    res.status(500).json({ success: false, message: 'Error retrieving chef orders', error });
  }
};

// Get Specific Order for Chef
export const getChefOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error retrieving chef order details:', error);
    res.status(500).json({ success: false, message: 'Error retrieving chef order details', error });
  }
};

// Update Order Status (For Chef to mark as "In Progress" or "Completed")
export const updateChefOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Ensure that the status can only be updated to valid values like "In Progress" or "Completed"
    const validStatuses = ['In Progress', 'Completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status for chef' });
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating chef order status:', error);
    res.status(500).json({ success: false, message: 'Error updating chef order status', error });
  }
};

// Mark Order as Ready for Pickup (For Chef)
export const markOrderReady = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Ensure the order is either in progress or pending before marking as ready
    const order = await Order.findByIdAndUpdate(orderId, { status: 'Ready for Pickup' }, { new: true });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order marked as ready for pickup', order });
  } catch (error) {
    console.error('Error marking order ready:', error);
    res.status(500).json({ success: false, message: 'Error marking order ready', error });
  }
};
