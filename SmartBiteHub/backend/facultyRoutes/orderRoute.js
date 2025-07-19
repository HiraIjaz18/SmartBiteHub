import express from 'express';
import {
  createOrder,
  updateOrderStatus,
  getFacultyOrders,
  getActiveFacultyOrder,
  getOrderDetails
} from '../facultyControllers/ForderController.js';

const ForderRouter = express.Router();

ForderRouter.post('/Forder', createOrder); // Place an order // List orders in the current interval
ForderRouter.put('/Forder/:id', updateOrderStatus); // Updat
ForderRouter.get('/faculty/:email/orders', getFacultyOrders);
ForderRouter.get('/active/:email', getActiveFacultyOrder);
ForderRouter.get('/:orderId', getOrderDetails);
 // Get order details

export default ForderRouter;
