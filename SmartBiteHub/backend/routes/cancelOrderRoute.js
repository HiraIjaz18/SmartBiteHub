import express from 'express';
import { cancelOrder } from '../controllers/cancelOrdercontroller.js';

const cancelrouter = express.Router();

cancelrouter.post('/cancel-order', cancelOrder);

export default cancelrouter;