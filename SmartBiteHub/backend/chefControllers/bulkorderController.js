import FBulkOrder from '../facultyModels/bulkorderModel.js'; // Faculty Bulk Order Model
import BulkOrder from '../models/bulkorderModel.js'; // Student Bulk Order Model

// Get Today's Bulk Orders (for Faculty and Students)
export const getTodaysBulkOrders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight to get today's date without time

    // Fetch Faculty Bulk Orders
    const facultyOrders = await FBulkOrder.find({ orderDate: today });

    // Fetch Student Bulk Orders
    const studentOrders = await BulkOrder.find({ orderDate: today });

    res.status(200).json({
      facultyOrders,
      studentOrders,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today\'s bulk orders', details: error.message });
  }
};
// Mark a Bulk Order as Delivered (for Faculty or Students)
export const markBulkOrderAsDelivered = async (req, res) => {
    try {
      const { id, type } = req.params; // `type` will specify if it's a faculty or student order
  
      let updatedOrder;
  
      if (type === 'faculty') {
        updatedOrder = await FBulkOrder.findByIdAndUpdate(
          id,
          { status: 'Completed' },
          { new: true }
        );
      } else if (type === 'student') {
        updatedOrder = await BulkOrder.findByIdAndUpdate(
          id,
          { status: 'Completed' },
          { new: true }
        );
      } else {
        return res.status(400).json({ error: 'Invalid order type' });
      }
  
      if (!updatedOrder) {
        return res.status(404).json({ error: 'Bulk order not found' });
      }
  
      res.status(200).json({ message: 'Bulk order marked as delivered successfully', order: updatedOrder });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark bulk order as delivered', details: error.message });
    }
  };
  