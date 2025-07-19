import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import adminModel from '../adminModels/adminModel.js'; 

// Create token with expiration
const createToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Validate user input
const validateUser = (data) => {
    const adminSchema = Joi.object({
        name: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(12).required(),
      
    });

    return adminSchema.validate(data);
};

// Register user and create wallet
const registerUser = async (req, res, next) => {
    const { error: validationError } = validateUser(req.body);
    const { name, email, password } = req.body;

    try {
        // Check if the user already exists
        const exists = await adminModel.findOne({ email });
        if (exists) {
            return res.status(409).json({ success: false, message: "Chef already exists" });
        }

        // Validate user input
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError.details[0].message });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user (chef)
        const newadmin = new adminModel({ name, email, password: hashedPassword});
        const admin = await newadmin.save();

        // Create JWT token for the user
        const createdToken = createToken(admin);

        // Set the response content type to JSON (ensures no HTML is sent)
        res.setHeader('Content-Type', 'application/json');

        // Return success response with chef data and token
        return res.status(200).json({
            success: true,
            message: "Registration successful",
            admin: {
                id: admin._id,
                name: admin.name,
                email:admin.email,
            },
            token: createdToken
        });
    } catch (error) {
        console.error("Error during registration:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Login user
const loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    try {
        // Find chef by email
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            return res.status(400).json({ success: false, message: "No chef found with this email" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password" });
        }

        // Create JWT token
        const token = createToken(admin);

        // Prepare response data
        const response = {
            success: true,
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
            // Include experience
        
            }
        };

        // Send success response with chef data and token
        res.json(response);
    } catch (error) {
        console.error("Error during login:", error);
        next(error); // Pass to error handling middleware
    }
};

export { loginUser, registerUser };