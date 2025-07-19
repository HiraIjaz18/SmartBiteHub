import express from 'express';
import { createOrder, listOrders, updateOrderStatus,getOrderDetails } from '../controllers/orderController.js';

const orderRouter = express.Router();

// Route to place an order
orderRouter.post('/order', createOrder);

// Route to list all orders
orderRouter.get('/orders', listOrders);

// Route to update order status
orderRouter.put('/order/:id', updateOrderStatus);
orderRouter.get('/userorders/:orderId', getOrderDetails);

export default orderRouter;