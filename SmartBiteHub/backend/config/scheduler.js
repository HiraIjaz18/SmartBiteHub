import schedule from 'node-schedule';
import RegularItem from '../models/regularMenuModel.js';
import SpecialItem from '../models/specialMenuModel.js';
import DailyItem from '../models/dailyMenuModel.js';

const updateDailyMenu = async () => {
  try {
    console.log('Starting daily menu update...');

    // Fetch items with quantity > 0
    const regularItems = await RegularItem.find({ quantity: { $gt: 0 } });
    const specialItems = await SpecialItem.find({ quantity: { $gt: 0 } });

    // Clear previous daily menu
    await DailyItem.deleteMany({});

    // Add Regular Items
    for (const item of regularItems) {
      const dailyItem = new DailyItem({
        itemId: item._id,
        itemType: 'RegularItem',
        name: item.name,
        quantity: item.quantity,
        availability: true,
      });
      await dailyItem.save();
    }

    // Add Special Items
    for (const item of specialItems) {
      const dailyItem = new DailyItem({
        itemId: item._id,
        itemType: 'SpecialItem',
        name: item.name,
        quantity: item.quantity,
        availability: true,
      });
      await dailyItem.save();
    }

    console.log('Daily menu updated successfully!');
  } catch (error) {
    console.error('Error updating daily menu:', error);
  }
};

// Schedule the job to run at 4 PM daily
schedule.scheduleJob('0 16 * * *', updateDailyMenu);
