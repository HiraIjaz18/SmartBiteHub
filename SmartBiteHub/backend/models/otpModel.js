import mongoose from 'mongoose';

const OTPSchema = new mongoose.Schema({
    email: { type: String, required: true }, // Email of the user requesting OTP
    otp: { type: String, required: true },   // The OTP code
    expiresAt: { type: Date, required: true }, // OTP expiration time
});

// Automatically delete expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTPModel = mongoose.model('OTP', OTPSchema);

export default OTPModel;