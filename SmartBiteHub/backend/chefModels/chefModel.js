import mongoose from "mongoose";
//import uniqueValidator from "mongoose-unique-validator"; // Import unique validator plugin

const chefSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true },
    specialty: { type: String, required: true }, // Added specialty field to identify the chef's expertise
    experience: { type: Number, required: true }, // Added experience field for years of experience
  },
  { timestamps: true }
);


const chefModel = mongoose.models.chef || mongoose.model("chef", chefSchema);
export default chefModel;
