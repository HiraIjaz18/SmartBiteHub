import express from 'express';
import { createBulkOrder,updateBulkOrderStatus,getOrderDetails } from '../controllers/bulkorderController.js';
const bulkrouter = express.Router();

// Route to create a new bulk order
bulkrouter.post('/bulk-orders', createBulkOrder);

// Route to get all bulk orders

// Route to get a specific bulk order by ID
bulkrouter.get('/bulk-orders/:id',getOrderDetails);

// Route to update the status of a bulk order
bulkrouter.patch('/bulk-orders/:id/status', updateBulkOrderStatus);

export default bulkrouter;