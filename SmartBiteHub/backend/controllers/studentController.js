import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import studentModel from '../models/studentModel.js';
import walletModel from '../models/walletModel.js';

const createToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const validateUser = (data) => {
    const studentSchema = Joi.object({
        name: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(12).required()
    });
    return studentSchema.validate(data);
};

const registerUser = async (req, res) => {
    const { error } = validateUser(req.body);
    const { name, email, password } = req.body;

    try {
        const exists = await studentModel.findOne({ email });
        if (exists) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new studentModel({ name, email, password: hashedPassword });
        const user = await newUser.save();

        const newWallet = new walletModel({ email, balance: 0 });
        await newWallet.save();

        const token = createToken(user);

        res.status(200).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                walletBalance: newWallet.balance
            },
            token
        });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    try {
        const user = await studentModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password" });
        }

        const wallet = await walletModel.findOne({ email });
        const balance = wallet ? wallet.balance : 0;

        const token = createToken(user);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                walletBalance: balance
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export { registerUser, loginUser };
