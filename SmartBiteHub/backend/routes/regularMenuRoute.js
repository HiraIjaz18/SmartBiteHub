import express from 'express';
import { addRegularItem, getRegularItems } from '../controllers/regularMenuController.js';


const RegularRouter = express.Router();

// Add a regular item
RegularRouter .post('/add', addRegularItem);

RegularRouter .get('/list', getRegularItems);

export default RegularRouter ;
