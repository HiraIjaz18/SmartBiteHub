import express from 'express';
import {
  createPreOrder,
  getAllPreOrders,
getOrderDetails,
  updatePreOrderStatus,
} from '../controllers/preorderController.js'; // Import the controller functions

const router = express.Router();

// Route to create a new Pre-Order
router.post('/preorder', createPreOrder);

// Route to get all Pre-Orders
router.get('/preorderlist', getAllPreOrders);

// Route to get a specific Pre-Order by ID
router.get('/preorder/:id', getOrderDetails);

// Route to update the status of a Pre-Order
router.patch('/preorder/:id/status', updatePreOrderStatus);

export default router;