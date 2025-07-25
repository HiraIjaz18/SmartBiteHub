import mongoose from 'mongoose';

const specialItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('SpecialItem', specialItemSchema);