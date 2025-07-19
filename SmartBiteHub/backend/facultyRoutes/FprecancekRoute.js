import express from 'express';
import FprecancelOrder from '../facultyControllers/fprecancelcontroller.js';
const FPrecancelrouter = express.Router();

// Cancel an order
FPrecancelrouter.post('/Fcancel', FprecancelOrder);

export default FPrecancelrouter; // Export using ES6 syntax