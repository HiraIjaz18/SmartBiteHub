import { updateDeliveryStatus, getOrdersForDelivery } from '../attendantController/bulkorderController.js';
import express from 'express';
        const Abulkrouter = express.Router();
        
        // Route to create a new bulk order
        Abulkrouter.get('/delivery-orders', getOrdersForDelivery);
        
        // Route to get all bulk orders
        Abulkrouter.patch('/delivery-order/:id', updateDeliveryStatus)
        
        // Route to get a specific bulk order by I
        
        export default Abulkrouter;