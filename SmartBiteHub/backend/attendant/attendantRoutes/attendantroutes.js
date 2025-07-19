import express from 'express';
import { loginUser, registerUser } from '../attendantController/attendantController.js'; // Ensure you import your controller correctly

const attendantRouter = express.Router();

attendantRouter.post('/login', loginUser); // Ensure the endpoint is defined here
attendantRouter.post('/register', registerUser); // Example for registration route

export default attendantRouter;
