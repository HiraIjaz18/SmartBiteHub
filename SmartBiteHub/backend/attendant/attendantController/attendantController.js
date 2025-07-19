import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import AttendantModel from '../ateendantModels/attedantModel.js';


// Create token with expiration
const createToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Validate user input
const validateUser = (data) => {
    const AttendantSchema = Joi.object({
        name: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(12).required()
    });

    return AttendantSchema.validate(data);
};

// Register user and create wallet
const registerUser = async (req, res, next) => {
    const { error: validationError } = validateUser(req.body);
    const { name, email, password } = req.body;

    try {
        // Check if the user already exists
        const exists = await AttendantModel.findOne({ email });
        if (exists) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        // Validate user input
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError.details[0].message });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new AttendantModel({ name, email, password: hashedPassword });
        const user = await newUser.save();

        // Create JWT token for the user
        const createdToken = createToken(user);

        // Set the response content type to JSON (ensures no HTML is sent)
        res.setHeader('Content-Type', 'application/json');

        // Return success response with user data and token
        return res.status(200).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
               
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
        // Find user by email
        const user = await AttendantModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "No user found with this email" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password" });
        }


        // Create JWT token
        const token = createToken(user);

        // Prepare response data
        const response = {
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                
            }
        };

        // Send success response with user data and token
        res.json(response);
    } catch (error) {
        console.error("Error during login:", error);
        next(error); // Pass to error handling middleware
    }
};

export { loginUser, registerUser };
