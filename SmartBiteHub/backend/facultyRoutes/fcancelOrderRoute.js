import express from 'express';
import cancelOrder from '../facultyControllers/FcancelOrdercontroller.js';// Import the cancelOrder function
const Fcancelrouter = express.Router();

// Cancel an order
Fcancelrouter.post('/cancel', cancelOrder);

export default Fcancelrouter; // Export using ES6 syntax