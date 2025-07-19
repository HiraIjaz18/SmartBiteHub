import crypto from 'crypto';
import FOrder from '../facultyModels/ForderModel.js';
import Notification from '../facultyModels/notificationModel.js';
import { getIO } from '../services/socketServices.js';
import cron from 'node-cron';

const ORDER_CONFIG = {
  CYCLE_DURATION: 45,
  BUFFER_DURATION: 5,
  DELIVERY_TIMES: {
    'Basement': 10,
    'Ground': 20,
    '1': 30,
    'Second': 40,
    'Third': 50
  },
  OPERATIONAL_HOURS: {
    start: 0,
    end: 17
  },
  STATUS_VALUES: ['pending', 'preparing', 'on the way', 'delivered', 'cancelled'],
  STUCK_ORDER_THRESHOLD: 24 * 60 * 60 * 1000
};

const initOrderScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      await updateOrderStatus();
      await cleanupStuckOrders();
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });
};

const cleanupStuckOrders = async () => {
  const cutoff = new Date(Date.now() - ORDER_CONFIG.STUCK_ORDER_THRESHOLD);
  await FOrder.updateMany(
    {
      status: { $in: ['pending', 'preparing', 'on the way'] },
      createdAt: { $lt: cutoff }
    },
    { 
      $set: { 
        status: 'cancelled',
        cancellationReason: 'System auto-cancellation' 
      }
    }
  );
};

const getCycleTimes = (orderTime) => {
  const orderDate = new Date(orderTime);
  const cycleStart = new Date(orderDate);
  cycleStart.setMinutes(Math.floor(orderDate.getMinutes() / 45) * 45, 0, 0, 0);
  return {
    cycleStart,
    cycleEnd: new Date(cycleStart.getTime() + ORDER_CONFIG.CYCLE_DURATION * 60000)
  };
};

const normalizeFloor = (floor) => {
  const normalized = String(floor).toLowerCase().replace(/\s+/g, '');
  const floorMap = {
    'basement': 'Basement', 'b': 'Basement',
    'ground': 'Ground', 'g': 'Ground',
    'first': '1', '1': '1',
    'second': 'Second', '2': 'Second',
    'third': 'Third', '3': 'Third'
  };
  return floorMap[normalized] || 'Ground';
};

const adjustToOperationalHours = (date) => {
  const now = new Date(date);
  const opStart = new Date(now);
  opStart.setHours(ORDER_CONFIG.OPERATIONAL_HOURS.start, 0, 0, 0);
  const opEnd = new Date(now);
  opEnd.setHours(ORDER_CONFIG.OPERATIONAL_HOURS.end, 0, 0, 0);

  if (now < opStart) {
    opStart.setDate(opStart.getDate() - 1);
    opEnd.setDate(opEnd.getDate() - 1);
  }

  return now >= opStart && now <= opEnd ? now : new Date(opEnd.setDate(opEnd.getDate() + 1));
};

const createStatusNotification = async (order, status) => {
  const notifications = {
    preparing: { title: 'Cooking Started', message: 'Your food is now being prepared' },
    'on the way': { title: 'On Its Way!', message: 'Your order is out for delivery' },
    delivered: { title: 'Order Delivered', message: 'Your food has arrived!' },
    pending: { title: 'Order Placed', message: 'Your order has been received' },
    cancelled: { title: 'Order Cancelled', message: 'Your order has been cancelled' }
  };

  try {
    const notification = await Notification.create({
      userId: order.facultyEmail,
      orderId: order._id,
      ...notifications[status],
      type: 'status',
      metadata: { status }
    });

    getIO().to(order.facultyEmail).emit('orderUpdate', {
      orderId: order._id,
      status,
      notification
    });
  } catch (error) {
    console.error('Notification error:', error);
  }
};

export const createOrder = async (req, res) => {
  try {
    const { items, floor, email, totalPrice } = req.body;

    if (!totalPrice || !email || !items?.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: items, email, and totalPrice are required'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const validFloor = normalizeFloor(floor);
    const now = new Date();

    // Get cycle times
    const { cycleStart, cycleEnd } = getCycleTimes(now);
    const deliveryTimeMinutes = ORDER_CONFIG.DELIVERY_TIMES[validFloor] || 30;

    // Calculate timeline
    const timeline = {
      orderPlaced: now,
      cycleStart,
      cycleEnd,
      bufferEnd: new Date(now.getTime() + ORDER_CONFIG.BUFFER_DURATION * 60000),
      preparationEnd: cycleEnd,
      deliveryEnd: adjustToOperationalHours(
        new Date(cycleEnd.getTime() + deliveryTimeMinutes * 60000)
      )
    };

    // Calculate fixed total time for the cycle
    const totalCycleTime = Math.ceil(
      (timeline.deliveryEnd - timeline.cycleStart) / 60000
    );

    const newOrder = new FOrder({
      items: items.map(({ itemName, itemType, quantity, itemPrice }) => ({
        itemName,
        itemType,
        quantity,
        price: itemPrice
      })),
      totalPrice,
      floor: validFloor,
      facultyEmail: email.toLowerCase(),
      token,
      timeline,
      status: 'pending',
      deliveryTime: deliveryTimeMinutes,
      orderDate: now,
      totalTime: totalCycleTime
    });

    const savedOrder = await newOrder.save();
    await createStatusNotification(savedOrder, 'pending');

    res.status(201).json({
      success: true,
      order: savedOrder,
      token
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const updateOrderStatus = async () => {
  try {
    const now = new Date();
    const statusTransitions = [
      { 
        from: 'pending', 
        to: 'preparing',
        condition: 'timeline.bufferEnd'
      },
      { 
        from: 'preparing', 
        to: 'on the way',
        condition: 'timeline.preparationEnd'
      },
      { 
        from: 'on the way', 
        to: 'delivered',
        condition: 'timeline.deliveryEnd'
      }
    ];

    for (const { from, to, condition } of statusTransitions) {
      const orders = await FOrder.find({
        status: from,
        [condition]: { $lte: now }
      });

      if (orders.length > 0) {
        await FOrder.updateMany(
          { _id: { $in: orders.map(o => o._id) } },
          { $set: { status: to } }
        );
        orders.forEach(order => createStatusNotification(order, to));
      }
    }
  } catch (error) {
    console.error('Status update error:', error);
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await FOrder.findByIdAndUpdate(
      orderId,
      { 
        status: 'cancelled',
        cancellationReason: 'User requested cancellation' 
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await createStatusNotification(order, 'cancelled');
    
    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

initOrderScheduler();

export const getActiveFacultyOrder = async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const order = await FOrder.findOne({
      facultyEmail: email,
      status: { $in: ['pending', 'preparing', 'on the way'] }
    }).sort({ createdAt: -1 });

    if (!order) return res.json({ success: true, data: null });

    const now = new Date();
    const cycleStart = new Date(order.timeline.cycleStart);
    const timeElapsed = Math.floor((now - cycleStart) / 60000);
    const timeLeft = Math.max(0, order.totalTime - timeElapsed);

    res.json({
      success: true,
      data: {
        ...order.toObject(),
        timeLeft,
        canCancel: order.status === 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const listOrders = async (req, res) => {
  try {
    const orders = await FOrder.find({})
      .lean()
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map(order => ({
      ...order,
      orderId: order._id.toString()
    }));

    res.json({
      success: true,
      count: formattedOrders.length,
      data: formattedOrders
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await FOrder.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderData = {
      ...order,
      orderId: order._id.toString()
    };

    res.json({
      success: true,
      data: orderData
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order',
      error: error.message
    });
  }
};

export const getFacultyOrders = async (req, res) => {
  try {
    const { email } = req.params;
    const now = new Date();

    const orders = await FOrder.find({ facultyEmail: email })
      .lean()
      .sort({ createdAt: -1 })
      .limit(20);

    const formattedOrders = orders.map(order => {
      const cycleStart = new Date(order.timeline.cycleStart);
      const timeElapsed = Math.floor((now - cycleStart) / 60000);
      const timeLeft = Math.max(0, order.totalTime - timeElapsed);

      return {
        ...order,
        orderId: order._id.toString(),
        orderDate: order.createdAt,
        timeLeft,
        isSingleFloorOrder: order.floor === '1'
      };
    });

    res.json({
      success: true,
      count: formattedOrders.length,
      data: formattedOrders
    });

  } catch (error) {
    console.error('Error fetching faculty orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const deletedOrder = await FOrder.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: error.message
    });
  }
};

export const getOrderWithNotifications = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await FOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const notifications = await Notification.find({ orderId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        order,
        notifications
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const STATUS_VALUES = ['pending', 'preparing', 'on the way', 'delivered'];