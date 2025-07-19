import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import PreOrder from '../models/preorderModel.js';
import BulkOrder from '../models/bulkorderModel.js';
import walletModel from '../models/walletModel.js'; // Import BulkOrder model
import DailyItem from '../models/dailyMenuModel.js'; // Import DailyItem model
import { getIO } from '../services/socketServices.js'; // Import socket.io instance
export const cancelOrder = async (req, res) => {
  let session;
  try {
    // Start session with retryWrites enabled
    session = await mongoose.startSession({
      retryWrites: true,
      retryReads: true
    });
    
    await session.withTransaction(async () => {
      const { orderId, email, orderType } = req.body;
      const io = getIO();

      if (!email) {
        throw new Error("Email is required.");
      }

      // Find wallet with session
      const wallet = await walletModel.findOne({ email: email.trim().toLowerCase() }).session(session);
      if (!wallet) {
        throw new Error("Wallet not found.");
      }

      // Find order based on type with session
      let order;
      switch (orderType) {
        case 'student':
        case 'pre':
          order = await PreOrder.findById(orderId).session(session);
          break;
        case 'bulk':
          order = await BulkOrder.findById(orderId).session(session);
          break;
        default:
          order = await Order.findById(orderId).session(session);
      }

      if (!order) {
        throw new Error("Order not found");
      }

      // Verify ownership
      if (order.email !== email) {
        throw new Error("Unauthorized access");
      }

      // Refund wallet
      if (typeof order.totalPrice === 'number') {
        wallet.balance += order.totalPrice;
        await wallet.save({ session });
      }

      // Update order status
      order.status = "Cancelled";
      await order.save({ session });

      // Restore menu items with retry logic
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const menuItem = await DailyItem.findOne({
            itemName: { $regex: new RegExp(`^${item.itemName.trim()}$`, 'i') },
          }).session(session);

          if (menuItem) {
            menuItem.quantity += item.quantity;
            await menuItem.save({ session });
          }
        }
      }

      // Get updated wallet balance
      const updatedWallet = await walletModel.findOne({ email: email.trim().toLowerCase() }).session(session);

      // Socket notifications
      const notificationConfig = {
        student: { event: 'student_pre_order_update' },
        pre: { event: 'pre_order_update' },
        bulk: { event: 'bulk_order_update' },
        default: { event: 'order_update' }
      };

      const { event } = notificationConfig[orderType] || notificationConfig.default;

      io.emit(event, {
        status: 'Cancelled',
        orderId,
        timestamp: new Date(),
        refundAmount: order.totalPrice,
        newBalance: updatedWallet.balance
      });

      io.emit('wallet_update', {
        email: email.trim().toLowerCase(),
        balance: updatedWallet.balance,
        transaction: {
          amount: order.totalPrice,
          type: 'refund',
          orderId,
          timestamp: new Date()
        }
      });

      return { success: true, message: "Order cancelled successfully" };
    });

  } catch (error) {
    console.error("Error cancelling order:", error);
    if (session) await session.abortTransaction();
    return res.status(500).json({ 
      success: false, 
      message: "Error cancelling order", 
      error: error.message 
    });
  } finally {
    if (session) session.endSession();
  }
};