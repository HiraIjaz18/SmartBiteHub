import express from 'express';
import { 
  listChefOrders, 
  getChefOrderDetails, 
  updateChefOrderStatus, 
  markOrderReady 
} from '../controllers/chefOrderController.js';

const router = express.Router();

// Chef Routes
router.get('/chef/orders', listChefOrders);
router.get('/chef/orders/:orderId', getChefOrderDetails);
router.patch('/chef/orders/status/:id', updateChefOrderStatus);
router.patch('/chef/orders/ready/:orderId', markOrderReady);

export default router;
