import FPreOrder from "../../facultyModels/FpreorderModel.js";


// Get Pre-Orders for Delivery (Filter by current day and time)
export const getPreOrdersForDelivery = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // Fetch pre-orders for today that are not yet delivered
    const preOrders = await FPreOrder.find({
      deliveryDate: { $gte: startOfToday, $lt: endOfToday },
      status: { $in: ['Pending', 'Preparing', 'Ready for Delivery'] }
    }).sort({ deliveryDate: 1 }); // Sort by earliest delivery first

    res.status(200).json(preOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pre-orders for delivery', details: error.message });
  }
};

// Update Pre-Order Delivery Status
export const updatePreOrderDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Preparing', 'Ready for Delivery', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updatedOrder = await FPreOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Pre-order not found' });
    }

    // If status is 'Ready for Delivery', schedule notifications
    if (status === 'Ready for Delivery') {
      await scheduleDeliveryNotifications(updatedOrder);
    }

    res.status(200).json({ message: 'Pre-order status updated successfully', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pre-order status', details: error.message });
  }
};

// Get upcoming deliveries (for notification scheduling)
export const getUpcomingDeliveries = async () => {
  const now = new Date();
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  
  return await FPreOrder.find({
    deliveryDate: { $gte: now, $lte: tenMinutesFromNow },
    status: 'Ready for Delivery',
    notificationSent: false
  });
};