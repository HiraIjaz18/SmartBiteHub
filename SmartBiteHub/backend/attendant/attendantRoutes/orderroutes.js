import express from 'express';
import { getDeliveryQueue,getActiveDeliveries,updateDeliveryStatus } from '../attendantController/aorder.js';

const attorderRouter = express.Router();

attorderRouter.get('/queue', getDeliveryQueue);
attorderRouter.put('/:id/status', updateDeliveryStatus);
attorderRouter.get('/active', getActiveDeliveries);

export default attorderRouter;
