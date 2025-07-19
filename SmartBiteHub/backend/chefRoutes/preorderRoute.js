import express from 'express';
import { getTodaysPreOrders, markOrderAsDelivered } from '../chefControllers/preorderControllers';

const Cprerouter = express.Router();

// Route to get today's pre-orders
Cprerouter.get('/todays-orders', getTodaysPreOrders);

// Route to mark an order as delivered
Cprerouter.put('/orders/:id/deliver', markOrderAsDelivered);

export default Cprerouter;
