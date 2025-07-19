import mongoose from "mongoose";
//import uniqueValidator from "mongoose-unique-validator"; // Import unique validator plugin

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true },
    otp: { type: String },
  },
  { timestamps: true }
);

// Apply unique validator plugin to studentSchema
//studentSchema.plugin(uniqueValidator, { message: '{PATH} already exists' });

const studentModel = mongoose.models.student || mongoose.model("student", studentSchema);
export default studentModel;
