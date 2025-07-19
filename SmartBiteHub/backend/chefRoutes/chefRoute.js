import express from 'express';
import { loginUser, registerUser } from '../chefControllers/chefController.js'; // Import chef controller

const chefRouter = express.Router();

chefRouter.post('/login', loginUser); // Define the login endpoint for chefs
chefRouter.post('/register', registerUser); // Define the registration endpoint for chefs

export default chefRouter;
