import mongoose from 'mongoose';

const regularItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  category: { type: String },
}, { timestamps: true });

export default mongoose.model('RegularItem', regularItemSchema);