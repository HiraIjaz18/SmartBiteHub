import express from 'express';
import { listTodayDailyMenuItems, deleteDailyItem,updateItemAvailability ,updateDailyItem} from '../controllers/dailyMenuController.js';

const dailyRouter = express.Router();

// Route to update daily items

dailyRouter.post('/update',updateDailyItem);
// Route to delete daily items
dailyRouter.delete('/delete/:id', deleteDailyItem);

// Route to list today's daily menu items
dailyRouter.get('/menu-items', listTodayDailyMenuItems);
dailyRouter.put('/update-availability', updateItemAvailability);

export default dailyRouter;
