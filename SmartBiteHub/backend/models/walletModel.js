import mongoose from 'mongoose';
import studentModel from '../models/studentModel.js';

// walletModel.js

const walletSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    balance: {
        type: Number,
        default: 0,
    },
    // Remove 'required' constraint on userId
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Make userId optional
    },
});


const walletModel = mongoose.models.wallet || mongoose.model("wallet", walletSchema);
export default walletModel;
