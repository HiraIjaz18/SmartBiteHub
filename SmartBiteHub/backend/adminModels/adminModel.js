import mongoose from "mongoose";
//import uniqueValidator from "mongoose-unique-validator"; // Import unique validator plugin

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true },
  
  },
  { timestamps: true }
);


const adminModel = mongoose.models.admin || mongoose.model("admin", adminSchema);
export default adminModel;