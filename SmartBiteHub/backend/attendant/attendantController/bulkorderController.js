import fBulkOrder from "../../facultyModels/FbulkOrderModel.js";

// Get Orders for Delivery (Next Day)
export const getOrdersForDelivery = async (req, res) => {
  try {
    const currentDate = new Date();
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0); // Start of the next day

    // Fetch orders for the next day
    const orders = await fBulkOrder.find({
      deliveryDate: { $gte: nextDay, $lt: new Date(nextDay.getTime() + 24 * 60 * 60 * 1000) }, // Next day
    });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery orders', details: error.message });
  }
};

// Update Delivery Status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Pending', 'Delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Update the order status
    const updatedOrder = await fBulkOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true } // Return the updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({ message: 'Delivery status updated successfully', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery status', details: error.message });
  }
};