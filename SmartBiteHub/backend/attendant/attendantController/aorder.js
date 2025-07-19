// controllers/attendantController.js
import FOrder from '../../facultyModels/ForderModel.js';
import { getIO } from '../../services/socketServices.js';

// Floor priority configuration
const FLOOR_PRIORITY = {
  'Basement': 1,    // Highest priority
  'Ground': 2,
  'First': 3,
  'Second': 4,
  'Third': 5        // Lowest priority
};

// Get numerical floor name from input
const getFloorName = (input) => {
  const floorMap = {
    'basement': 'Basement',
    'ground': 'Ground',
    '0': 'Ground',
    '1': 'First',
    '2': 'Second',
    '3': 'Third',
    'first': 'First',
    'second': 'Second',
    'third': 'Third'
  };
  
  return floorMap[input.toLowerCase()] || input;
};

export const getDeliveryQueue = async (req, res) => {
  try {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);
    
    const orders = await FOrder.find({ 
      status: { $in: ['Preparing', 'On the Way'] },
      orderDate: { $gte: windowStart }
    }).sort({
      status: -1,
      floor: 1, // Sort by floor priority
      orderDate: 1
    });

    // Add delivery time estimates
    const ordersWithDeliveryInfo = orders.map(order => {
      let timeLeft = 0;
      if (order.status === 'Preparing') {
        timeLeft = Math.ceil((order.preparationEnd - now) / (1000 * 60));
      } else if (order.status === 'On the Way' && order.estimatedDeliveryTime) {
        timeLeft = Math.ceil((order.estimatedDeliveryTime - now) / (1000 * 60));
      }
      
      return {
        ...order._doc,
        timeLeft,
        priority: FLOOR_PRIORITY[order.floor] || 3
      };
    });

    res.json({ success: true, data: ordersWithDeliveryInfo });
  } catch (error) {
    console.error('Error fetching delivery queue:', error);
    res.status(500).json({ success: false, message: 'Error fetching delivery queue' });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updateData = { status };

    if (status === 'Delivered') {
      updateData.deliveryEnd = new Date();
    }

    const order = await FOrder.findByIdAndUpdate(id, updateData, { new: true });
    
    // Emit socket event
    getIO().emit('orderUpdated', order);
    
    res.json({ success: true, message: 'Delivery status updated', data: order });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ success: false, message: 'Error updating delivery status' });
  }
};

export const getActiveDeliveries = async (req, res) => {
  try {
    const deliveries = await FOrder.find({
      attendantId: req.user._id,
      status: 'On the Way'
    });

    res.json({ 
      success: true, 
      data: deliveries 
    });
  } catch (error) {
    console.error('Error fetching active deliveries:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching deliveries',
      error: error.message 
    });
  }
};