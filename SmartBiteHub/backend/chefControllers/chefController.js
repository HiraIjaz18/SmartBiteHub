import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import chefModel from '../chefModels/chefModel.js'; 

// Create token with expiration
const createToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Validate user input
const validateUser = (data) => {
    const chefSchema = Joi.object({
        name: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(12).required(),
        specialty: Joi.string().required(), // Added specialty field
        experience: Joi.number().required(), // Added experience field
    });

    return chefSchema.validate(data);
};

// Register user and create wallet
const registerUser = async (req, res, next) => {
    const { error: validationError } = validateUser(req.body);
    const { name, email, password, specialty, experience } = req.body;

    try {
        // Check if the user already exists
        const exists = await chefModel.findOne({ email });
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
        const newChef = new chefModel({ name, email, password: hashedPassword, specialty, experience });
        const chef = await newChef.save();

        // Create JWT token for the user
        const createdToken = createToken(chef);

        // Set the response content type to JSON (ensures no HTML is sent)
        res.setHeader('Content-Type', 'application/json');

        // Return success response with chef data and token
        return res.status(200).json({
            success: true,
            message: "Registration successful",
            chef: {
                id: chef._id,
                name: chef.name,
                email: chef.email,
                specialty: chef.specialty,
                experience: chef.experience,
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
        const chef = await chefModel.findOne({ email });
        if (!chef) {
            return res.status(400).json({ success: false, message: "No chef found with this email" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, chef.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password" });
        }

        // Create JWT token
        const token = createToken(chef);

        // Prepare response data
        const response = {
            success: true,
            message: "Login successful",
            token,
            chef: {
                id: chef._id,
                email: chef.email,
                name: chef.name,
                specialty: chef.specialty, // Include specialty
                experience: chef.experience, // Include experience
        
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
