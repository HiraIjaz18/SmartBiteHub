import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Joi from "joi";
import facultyModel from "../facultyModels/facultyModel.js";
import fwallet from "../facultyModels/fwalletModel.js"; // Import wallet model

// Create token with expiration
const createToken = (user) => {
    return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Validate user input for faculty (signup)
// Validation schema for faculty registration
const validateFaculty = (data) => {
    const facultySchema = Joi.object({
        name: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(12).required(),
        wing: Joi.string().required(), // Add wing validation
        roomNumber: Joi.string().required(), // Add roomNumber validation
        floor: Joi.string().required(), // Add floor validation
    });

    return facultySchema.validate(data);
};
// Login faculty (same as student)
// facultyController.js (Login Logic)
const loginFaculty = async (req, res, next) => {
  const { email, password } = req.body;

  // Basic input validation
  if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
      // Find faculty by email
      const faculty = await facultyModel.findOne({ email });
      if (!faculty) {
          return res.status(400).json({ success: false, message: "No faculty found with this email" });
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, faculty.password);
      if (!isMatch) {
          return res.status(400).json({ success: false, message: "Incorrect password" });
      }

      // Fetch wallet balance
      const wallet = await fwallet.findOne({ email });
      const balance = wallet ? wallet.balance : 0; // Default to 0 if no wallet is found

      // Create JWT token
      const token = createToken(faculty);

      // Prepare response data
      const response = {
          success: true,
          message: "Login successful",
          token,
          user: {
              id: faculty._id,
              email: faculty.email,
              name: faculty.name,
              wing: faculty.wing,
              roomNumber: faculty.roomNumber,
              floor: faculty.floor,
              walletBalance: balance // Include wallet balance in response
          }
      };

      // Send success response with user data and token
      res.json(response);
  } catch (error) {
      console.error("Error during login:", error);
      next(error); // Pass to error handling middleware
  }
};
// Register faculty (with room number for delivery)
const registerFaculty = async (req, res, next) => {
  const { error: validationError } = validateFaculty(req.body);
  const { name, email, password, wing, roomNumber, floor } = req.body;

  try {
      // Check if the faculty already exists
      const exists = await facultyModel.findOne({ email });
      if (exists) {
          return res.status(409).json({ success: false, message: "Faculty already exists" });
      }

      // Validate user input
      if (validationError) {
          return res.status(400).json({ success: false, message: validationError.details[0].message });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new faculty
      const newFaculty = new facultyModel({ name, email, password: hashedPassword, wing, roomNumber, floor });
      const faculty = await newFaculty.save();

      // Create wallet for new faculty with zero balance
      const newWallet = new fwallet({ email, balance: 0 });
      await newWallet.save();

      // Create JWT token for the faculty
      const createdToken = createToken(faculty);

      // Return success response with user data and token
      return res.status(200).json({
          success: true,
          message: "Registration successful",
          user: {
              id: faculty._id,
              name: faculty.name,
              email: faculty.email,
              wing: faculty.wing,
              roomNumber: faculty.roomNumber,
              floor: faculty.floor,
              walletBalance: newWallet.balance // Set wallet balance to zero for a new user
          },
          token: createdToken
      });
  } catch (error) {
      console.error("Error during registration:", error);
      return res.status(500).json({ success: false, message: error.message });
  }
};
const getFacultyDetails = async (req, res) => {
  const { email } = req.params;

  try {
      const faculty = await facultyModel.findOne({ email });
      if (!faculty) {
          return res.status(404).json({ success: false, message: 'Faculty not found' });
      }

      res.status(200).json({
          success: true,
          faculty: {
            name:faculty.name,
              wing: faculty.wing,
              floor: faculty.floor,
              roomNumber: faculty.roomNumber,
          },
      });
  } catch (error) {
      console.error('Error fetching faculty details:', error);
      res.status(500).json({ success: false, message: 'Error fetching faculty details' });
  }
};

export { loginFaculty, registerFaculty,getFacultyDetails };
