import DailyItem from '../models/dailyMenuModel.js';
import RegularItem from '../models/regularMenuModel.js';
import SpecialItem from '../models/specialMenuModel.js';

// Add or Update Daily Item
export const updateDailyItem = async (req, res) => {
  const { itemType, itemName, quantity, availability } = req.body;

  console.log('Received request:', req.body); // Debugging log

  // Check if all required fields are present
  if (!itemType || !itemName || quantity === undefined || availability === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Determine the correct model based on itemType
    const ItemModel = itemType === 'regular' ? RegularItem : SpecialItem;
    const itemTypeValue = itemType === 'regular' ? 'RegularItem' : 'SpecialItem'; // Set correct itemType value

    // Find the item in the database
    const item = await ItemModel.findOne({ name: itemName });
    if (!item) {
      console.log('Item not found:', itemName); // Debugging log
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if the item already exists in the daily menu
    const existingDailyItem = await DailyItem.findOne({ itemId: item._id, itemType: itemTypeValue });

    let responseMessage;
    let statusCode;

    if (existingDailyItem) {
      // Update the existing daily item
      existingDailyItem.quantity = quantity;
      existingDailyItem.availability = availability;
      await existingDailyItem.save();

      statusCode = 200;
      responseMessage = 'Daily item updated';
    } else {
      // Create a new daily item
      const newDailyItem = new DailyItem({
        itemId: item._id,
        itemType: itemTypeValue,
        itemName: itemName, // Use itemName instead of name
        quantity,
        availability,
      });

      await newDailyItem.save();
      statusCode = 201;
      responseMessage = 'Daily item added';
    }

    console.log('Response:', { success: true, message: responseMessage });
    res.status(statusCode).json({ success: true, message: responseMessage });
  } catch (error) {
    console.error('Error updating daily item:', error); // Debugging log
    res.status(500).json({ success: false, message: 'Error updating daily item', error: error.message });
  }
};

// Delete Daily Menu Item
export const deleteDailyItem = async (req, res) => {
  try {
    const { id } = req.params;

    await DailyItem.findByIdAndDelete(id);

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting daily item:', error);
    res.status(500).json({ success: false, message: 'Error deleting daily item', error });
  }
};

// List Today's Daily Menu Items
export const listTodayDailyMenuItems = async (req, res) => {
  try {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    // Special items are only available from 4 PM to 8 AM
    const isSpecialItemAvailable = currentHour >= 16 || currentHour < 8;

    const dailyMenuItems = await DailyItem.find({
      quantity: { $gt: 0 },
      availability: true,
    }).populate('itemId', 'name description price imageUrl');

    const formattedItems = dailyMenuItems.map((item) => ({
      _id: item._id, // Include item ID for deletion
      name: item.itemId.name,
      itemType: item.itemType === 'RegularItem' ? 'Regular' : 'Special', // Include item type
      quantity: item.quantity,
      availability: item.availability && (item.itemType === 'RegularItem' || isSpecialItemAvailable),
      description: item.itemId.description,
      price: item.itemId.price,
      imageUrl: item.itemId.imageUrl,
    }));

    res.json({ success: true, data: formattedItems });
  } catch (error) {
    console.error("Error retrieving today's daily menu items:", error);
    res.status(500).json({ success: false, message: "Error retrieving today's daily menu items", error });
  }
};
export const updateItemAvailability = async (req, res) => {
  try {
    const { items } = req.body;

    // Log the request payload
    console.log('Request Payload:', req.body);

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid items data' });
    }

    // Log all DailyItem documents for debugging
    const allItems = await DailyItem.find({});
    console.log('All Daily Items:', JSON.stringify(allItems, null, 2));

    for (const item of items) {
      const { itemName, quantity } = item;

      // Log the item being processed
      console.log(`Processing item: ${itemName}, Quantity: ${quantity}`);

      // Normalize input data (trim and lowercase)
      const normalizedItemName = itemName.trim().toLowerCase();

      // Find the item by its name (case-insensitive search)
      const dailyItem = await DailyItem.findOne({
        itemName: { $regex: new RegExp(`^${normalizedItemName}$`, 'i') },
      });

      if (!dailyItem) {
        console.log(`Item not found: ${itemName}`);
        continue; // Skip to the next item if the current one is not found
      }

      // Update the item's quantity
      dailyItem.quantity -= quantity;
      if (dailyItem.quantity < 0) {
        dailyItem.quantity = 0; // Ensure quantity doesn't go below 0
      }

      // Save the updated item
      await dailyItem.save();

      // Log the update result
      console.log(`Updated item: ${itemName}, New Quantity: ${dailyItem.quantity}`);
    }

    res.json({ success: true, message: 'Menu items availability updated' });
  } catch (error) {
    console.error('Error updating item availability:', error);
    res.status(500).json({ success: false, message: 'Error updating item availability', error });
  }
};