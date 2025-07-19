import mongoose from 'mongoose';
import facultyModel from '../facultyModels/facultyModel.js';

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


const fwallet = mongoose.models.fwallet || mongoose.model("fwallet", walletSchema);
export default fwallet;
