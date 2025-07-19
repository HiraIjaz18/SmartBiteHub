import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  comment: { type: String, required: true, maxlength: 250 },
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);