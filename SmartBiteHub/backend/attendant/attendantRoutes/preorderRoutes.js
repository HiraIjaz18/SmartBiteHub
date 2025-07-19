import express from 'express';
import {
  getPreOrdersForDelivery,
  updatePreOrderDeliveryStatus,
} from '../attendantController/preorderController.js';

const preorderRouter = express.Router();

// Route to fetch pre-orders for delivery (next day)
preorderRouter.get('/delivery-orders', getPreOrdersForDelivery);

// Route to update pre-order delivery status
preorderRouter.patch('/delivery-orders/:id', updatePreOrderDeliveryStatus);

export default preorderRouter;