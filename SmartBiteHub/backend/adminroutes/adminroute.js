import express from 'express';
import { loginUser, registerUser } from '../admincontroller/adminController.js';

const adminRouter = express.Router();

adminRouter.post('/login', loginUser);
adminRouter.post('/register', registerUser);

export default adminRouter;