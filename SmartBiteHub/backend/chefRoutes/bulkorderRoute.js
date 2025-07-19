import express from 'express';
import { getTodaysBulkOrders, markBulkOrderAsDelivered } from '../controllers/bulkOrderController.js';

const Cbulkrouter = express.Router();

// Route to get today's bulk orders for both Faculty and Students
Cbulkrouter.get('/today', getTodaysBulkOrders);

// Route to mark a bulk order as delivered for Faculty or Student
Cbulkrouter.patch('/deliver/:type/:id', markBulkOrderAsDelivered);

export default Cbulkrouter;
