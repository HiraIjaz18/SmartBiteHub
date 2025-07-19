import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import studentModel from '../models/studentModel.js';
import OTPModel from '../models/otpModel.js';

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email service (e.g., Gmail, Outlook)
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASSWORD, // Your email password
    },
});

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to user's email
const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully.');
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email.');
    }
};

// Forgot Password: Send OTP to registered users only
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the user is registered
        const user = await studentModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Email not registered' });
        }

        // Generate OTP
        const otp = generateOTP();

        // Set OTP expiration time (e.g., 10 minutes from now)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Save OTP to the temporary OTP collection
        const otpRecord = new OTPModel({ email, otp, expiresAt });
        await otpRecord.save();

        // Send OTP to the user's email
        await sendOTP(email, otp);

        return res.status(200).json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Reset Password: Verify OTP and update password
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        // Check if the user is registered
        const user = await studentModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Email not registered' });
        }

        // Find the OTP record
        const otpRecord = await OTPModel.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Check if the OTP has expired
        if (otpRecord.expiresAt < new Date()) {
            console.log('OTP expired at:', otpRecord.expiresAt);
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        // Delete the OTP record after use
        await OTPModel.deleteOne({ _id: otpRecord._id });
        console.log('OTP record deleted successfully.');

        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export { forgotPassword, resetPassword };