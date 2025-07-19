import crypto from 'crypto';
import mongoose from 'mongoose';
import FPreOrder from '../facultyModels/FpreorderModel.js';
import SpecialItem from '../models/specialMenuModel.js';
import { getIO } from '../services/socketServices.js';

export const createPreOrder = async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    const { items, deliveryDate, deliveryTime, wing, floor, roomNumber } = req.body;

    // Modify the date validation logic:
const today = new Date();
today.setHours(0, 0, 0, 0);

const orderDeliveryDate = new Date(deliveryDate);
orderDeliveryDate.setHours(0, 0, 0, 0);

// Compare dates in UTC
const todayUTC = Date.UTC(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

const deliveryUTC = Date.UTC(
  orderDeliveryDate.getFullYear(),
  orderDeliveryDate.getMonth(),
  orderDeliveryDate.getDate()
);

if (deliveryUTC <= todayUTC) {
  return res.status(400).json({
    success: false,
    message: 'Delivery date must be at least tomorrow'
  });
}
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must include at least one special item.' 
      });
    }

    let totalPrice = 0;
    for (const item of items) {
      const { itemName, quantity, itemPrice } = item;

      if (!itemName || quantity === undefined || itemPrice === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: 'Each item must include name, quantity, and price.' 
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Quantity must be greater than 0.' 
        });
      }

      if (itemPrice <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Price must be greater than 0.' 
        });
      }

      totalPrice += quantity * itemPrice;
    }

    const hexCode = crypto.randomBytes(16).toString('hex');
    const newPreOrder = new FPreOrder({
      items,
      totalPrice,
      orderDate: new Date(), // Today's date
      deliveryDate: orderDeliveryDate, // Tomorrow's date
      deliveryTime,
      status: 'Pending',
      token: hexCode,
      wing,
      floor,
      roomNumber,
    });

    const savedOrder = await newPreOrder.save();

    res.json({
      success: true,
      message: 'Pre-order created successfully',
      order: savedOrder,
      token: hexCode,
      orderId: savedOrder._id,
    });
  } catch (error) {
    console.error('Error creating pre-order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating pre-order', 
      error: error.message 
    });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await FPreOrder.findById(orderId);

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
    console.error('Error retrieving order details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving order details', 
      error 
    });
  }
};

export const updatePreOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Completed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status value' 
      });
    }

    const updatedOrder = await FPreOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ 
        error: 'Pre-order not found' 
      });
    }

    res.status(200).json({ 
      message: 'Order status updated successfully', 
      order: updatedOrder 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update order status', 
      details: error.message 
    });
  }
};