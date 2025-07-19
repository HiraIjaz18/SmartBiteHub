import express from 'express';
import { loginUser, registerUser } from '../controllers/studentController.js'; // Ensure you import your controller correctly

const studentRouter = express.Router();

studentRouter.post('/login', loginUser); // Ensure the endpoint is defined here
studentRouter.post('/register', registerUser); // Example for registration route

export default studentRouter;
