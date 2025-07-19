import mongoose from "mongoose";
//import uniqueValidator from "mongoose-unique-validator"; // Import unique validator plugin

const AttendantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true },
    
  },
  { timestamps: true }
);

// Apply unique validator plugin to studentSchema
//studentSchema.plugin(uniqueValidator, { message: '{PATH} already exists' });

const AttendantModel = mongoose.models.Attendant || mongoose.model("Attendant", AttendantSchema);
export default AttendantModel;
