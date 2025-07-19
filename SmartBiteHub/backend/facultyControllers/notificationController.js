import Notification from '../facultyModels/notificationModel.js';
import FOrder from '../facultyModels/ForderModel.js';

export const createNotification = async (req, res) => {
  try {
    const { userId, orderId, title, message, type, metadata } = req.body;
    
    const notification = await Notification.create({
      userId,
      orderId,
      title,
      message,
      type,
      metadata
    });

    // Emit socket event if needed
    // getIO().to(userId).emit('newNotification', notification);

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
      
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const handleOrderStatusChange = async (orderId, newStatus) => {
  try {
    const order = await FOrder.findById(orderId).populate('facultyEmail');
    if (!order) return;

    let notificationData;
    
    switch(newStatus) {
      case 'preparing':
        notificationData = {
          title: 'Cooking Started',
          message: 'Your food is now being prepared',
          type: 'status'
        };
        break;
      case 'on the way':
        notificationData = {
          title: 'On Its Way!',
          message: `Your order is out for delivery`,
          type: 'status'
        };
        break;
      case 'delivered':
        notificationData = {
          title: 'Order Delivered',
          message: 'Your food has arrived!',
          type: 'status'
        };
        break;
      default:
        return;
    }

    await Notification.create({
      userId: order.facultyEmail._id,
      orderId: order._id,
      ...notificationData,
      metadata: { status: newStatus }
    });

  } catch (error) {
    console.error('Notification error:', error);
  }
};