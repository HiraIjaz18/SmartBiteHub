import FPreOrder from '../facultyModels/preorderModel.js'; // Faculty Pre-Order Model
import preOrder from '../models/preorderModel.js'; // Student Pre-Order Model

// Get Today's Pre-Orders (for Faculty and Students)
export const getTodaysPreOrders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch Faculty Pre-Orders
    const facultyOrders = await FPreOrder.find({ orderDate: today }).populate('userId', 'name email');

    // Fetch Student Pre-Orders
    const studentOrders = await preOrder.find({ orderDate: today }).populate('userId', 'name email');

    res.status(200).json({
      facultyOrders,
      studentOrders,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today\'s pre-orders', details: error.message });
  }
};

// Mark an Order as Delivered (for Faculty or Students)
export const markOrderAsDelivered = async (req, res) => {
  try {
    const { id, type } = req.params; // `type` will specify if it's a faculty or student order

    let updatedOrder;

    if (type === 'faculty') {
      updatedOrder = await FPreOrder.findByIdAndUpdate(
        id,
        { status: 'Completed' },
        { new: true }
      );
    } else if (type === 'student') {
      updatedOrder = await preOrder.findByIdAndUpdate(
        id,
        { status: 'Completed' },
        { new: true }
      );
    } else {
      return res.status(400).json({ error: 'Invalid order type' });
    }

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({ message: 'Order marked as delivered successfully', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark order as delivered', details: error.message });
  }
};
