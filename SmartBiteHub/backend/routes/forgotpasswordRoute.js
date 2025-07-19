import express from 'express';
import { forgotPassword, resetPassword } from '../controllers/forgetpasswordController.js';

const Forgotrouter = express.Router();

// Forgot Password Route
Forgotrouter.post('/forgot-password', forgotPassword);

// Reset Password Route
Forgotrouter.post('/reset-password', resetPassword);

export default Forgotrouter;