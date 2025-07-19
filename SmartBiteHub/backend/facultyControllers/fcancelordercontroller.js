import FOrder from '../facultyModels/ForderModel.js';

import fBulkOrder from '../facultyModels/FbulkorderModel.js';
import fwallet from '../facultyModels/fwalletModel.js';
import DailyItem from "../models/dailyMenuModel.js";
import { getIO } from '../services/socketServices.js';
import mongoose from "mongoose";

const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { orderId, email } = req.body;
    console.log(`Cancellation request for order: ${orderId}, email: ${email}`);

    // Validate input
    if (!email || !orderId) {
      throw new Error("Email and order ID are required");
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // 1. Retrieve Wallet with verbose logging
    const wallet = await fwallet.findOne({ email: sanitizedEmail }).session(session);
    console.log('Wallet found:', wallet ? true : false);
    if (!wallet) throw new Error("Wallet not found");
    const initialBalance = wallet.balance;

    // 2. Retrieve Order from all collections
    let order = await FOrder.findById(orderId).session(session);
    
    console.log('Order found:', order ? order._id : 'Not found');
    if (!order) throw new Error("Order not found");
    if (order.status.toLowerCase() === 'cancelled') {
      throw new Error("Order already cancelled");
    }

    // 3. Update Wallet Balance
    const refundAmount = order.totalPrice;
    console.log(`Refunding amount: ${refundAmount} to wallet: ${wallet._id}`);
    wallet.balance = Number(wallet.balance) + Number(refundAmount);
    await wallet.save({ session });
    console.log('Wallet updated. New balance:', wallet.balance);

    // 4. Restore Item Quantities with validation
    if (order.items?.length) {
      console.log(`Restoring quantities for ${order.items.length} items`);
      const updateResults = await Promise.all(order.items.map(async (item) => {
        // Changed validation to check for itemName instead of itemId
        if (!item.itemName || !item.quantity) {
          console.warn('Invalid item format:', item);
          return null;
        }
    
        console.log(`Updating item ${item.itemName} with quantity +${item.quantity}`);
        
        // Find and update by itemName instead of ID
        const updatedItem = await DailyItem.findOneAndUpdate(
          { itemName: item.itemName }, // Query by itemName
          { $inc: { quantity: item.quantity } },
          { new: true, session }
        );
    
        if (!updatedItem) {
          console.error(`Item '${item.itemName}' not found in DailyItems`);
          throw new Error(`Item '${item.itemName}' not found`);
        }
        return updatedItem;
      }));
      
      console.log('Items restored:', updateResults.filter(Boolean).length);
    }
    // 5. Update Order Status
    order.status = "Cancelled";
    await order.save({ session });
    console.log(`Order ${order._id} status updated to Cancelled`);

    await session.commitTransaction();
    console.log('Transaction committed successfully');

    // 6. Socket Notification
    const io = getIO();
    io.to(`order_${orderId}`).emit('orderUpdated', {
      status: 'Cancelled',
      orderId,
      email: sanitizedEmail,
      refundAmount,
      newBalance: wallet.balance
    });

    return res.json({ 
      success: true, 
      newBalance: wallet.balance,
      message: `Order cancelled successfully. Refunded: ${refundAmount}`
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("CANCELLATION ERROR:", error.message);
    console.error(error.stack);
    
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Cancellation failed",
      errorDetails: error.message
    });
  } finally {
    session.endSession();
  }
};

export default cancelOrder;