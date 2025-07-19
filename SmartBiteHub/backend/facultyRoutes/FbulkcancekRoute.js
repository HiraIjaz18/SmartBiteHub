import express from 'express';
import fbulkcancelOrder from '../facultyControllers/fbulkcancelcontroller.js'
const Fbulkcancelrouter = express.Router();

// Cancel an order
Fbulkcancelrouter.post('/Fcancel', fbulkcancelOrder);

export default Fbulkcancelrouter; // Export using ES6 syntax