import FPreOrder from '../facultyModels/FpreorderModel.js';
import fwallet from '../facultyModels/fwalletModel.js';
import DailyItem from "../models/dailyMenuModel.js";
import { getIO } from '../services/socketServices.js';
import mongoose from "mongoose";

const FprecancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { orderId, email } = req.body;
    console.log(`Pre-order cancellation request for: ${orderId}`);

    if (!email || !orderId) {
      throw new Error("Email and order ID are required");
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Validate wallet
    const wallet = await fwallet.findOne({ email: sanitizedEmail }).session(session);
    if (!wallet) throw new Error("Wallet not found");

    // Retrieve and validate pre-order
    const order = await FPreOrder.findById(orderId).session(session);
    if (!order) throw new Error("Pre-order not found");
    if (order.status.toLowerCase() === 'cancelled') {
      throw new Error("Order already cancelled");
    }

    // Check if cancellation window is still open
    const now = new Date();
    const orderTime = new Date(order.createdAt);
    const timeElapsed = (now - orderTime) / 1000; // in seconds
    
    if (timeElapsed > 300) { // 5 minutes window
      throw new Error("Cancellation window has expired");
    }

    // Process refund
    const refundAmount = order.totalPrice;
    wallet.balance = Number(wallet.balance) + Number(refundAmount);
    await wallet.save({ session });

    // Restore item quantities
    if (order.items?.length) {
      await Promise.all(order.items.map(async (item) => {
        if (!item.itemName || !item.quantity) {
          throw new Error("Invalid item format in pre-order");
        }
        
        const updatedItem = await DailyItem.findOneAndUpdate(
          { itemName: item.itemName },
          { $inc: { quantity: item.quantity } },
          { new: true, session }
        );
        
        if (!updatedItem) {
          throw new Error(`Item '${item.itemName}' not found`);
        }
      }));
    }

    // Update order status
    order.status = "Cancelled";
    await order.save({ session });
    await session.commitTransaction();

    // Socket notification
    const io = getIO();
    io.to(`pre_order_${orderId}`).emit('pre_order_cancelled', {
      status: 'Cancelled',
      orderId,
      orderType: 'pre',
      email: sanitizedEmail,
      refundAmount,
      newBalance: wallet.balance,
      timestamp: new Date()
    });

    io.to('admin_dashboard').emit('pre_order_activity', {
      type: 'cancellation',
      orderId,
      user: sanitizedEmail,
      amount: refundAmount,
      timestamp: new Date()
    });

    return res.json({ 
      success: true, 
      newBalance: wallet.balance,
      message: `Pre-order cancelled successfully. Refunded: ₹${refundAmount}`
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("PRE-ORDER CANCELLATION ERROR:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Pre-order cancellation failed",
      errorDetails: error.message
    });
  } finally {
    session.endSession();
  }
};

export default FprecancelOrder;