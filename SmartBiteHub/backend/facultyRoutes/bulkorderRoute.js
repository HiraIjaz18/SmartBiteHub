import express from 'express';
import { createBulkOrder, getAllBulkOrders,getOrderDetails } from '../facultyControllers/FbulkorderController.js';// Adjust the path as needed

const Fbulkrouter = express.Router();

// Route to create a new bulk order
Fbulkrouter.post('/Fbulk-orders', createBulkOrder);

// Route to get all bulk orders
Fbulkrouter.get('/Fbulk-orders', getAllBulkOrders);
Fbulkrouter.get('/Fbulk-orders:/orderId', getOrderDetails)
// Route to get a specific bulk order by I

export default Fbulkrouter;
