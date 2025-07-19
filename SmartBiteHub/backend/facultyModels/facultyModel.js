import mongoose from "mongoose";
//import uniqueValidator from "mongoose-unique-validator"; // Import unique validator plugin

// facultyModel.js
const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true },
    wing: { type: String, required: true }, // Add wing
    roomNumber: { type: String, required: true }, // Add roomNumber
    floor: { type: String, required: true }, // Add floor
  },
  { timestamps: true }
);
const facultyModel = mongoose.models.faculty || mongoose.model("faculty", facultySchema);
export default facultyModel;