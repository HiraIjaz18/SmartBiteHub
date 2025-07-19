import express from 'express';
import { addSpecialItem, getSpecialItems } from '../controllers/specialMenuController.js';

const SpecialRouter = express.Router();

// Add a special item
SpecialRouter.post('/add', addSpecialItem);

// Get all special items
SpecialRouter.get('/list', getSpecialItems);

export default SpecialRouter ;