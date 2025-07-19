import express from 'express';
import { 
  createFacultyOrder, 
  listFacultyOrders, 
  updateFacultyOrderStatus, 
  getFacultyOrderDetails 
} from '../controllers/facultyOrderController.js';

const router = express.Router();

// Faculty Routes
router.post('/faculty/orders', createFacultyOrder);
router.get('/faculty/orders', listFacultyOrders);
router.get('/faculty/orders/:orderId', getFacultyOrderDetails);
router.patch('/faculty/orders/status/:id', updateFacultyOrderStatus);

export default router;
