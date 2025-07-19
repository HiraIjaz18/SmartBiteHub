import express from 'express';
import {
  createPreOrder,
  getOrderDetails,
  updatePreOrderStatus,
} from '../facultyControllers/FpreorderControllers.js'; // Import the controller functions

const Frouter = express.Router();

// Route to create a new Pre-Order
Frouter.post('/Fpreorder', createPreOrder);

// Route to get all Pre-Orders


// Route to get a specific Pre-Order by ID
Frouter.get('/Fpreorder/:id', getOrderDetails);

// Route to update the status of a Pre-Order
Frouter.patch('/Fpreorder/:id/status', updatePreOrderStatus);

export default Frouter;
