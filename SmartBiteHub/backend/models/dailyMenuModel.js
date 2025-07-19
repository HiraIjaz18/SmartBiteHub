import mongoose from 'mongoose';

const dailyMenuSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, refPath: 'itemType', required: true },
  itemName:{type:String},
  itemType: { type: String, enum: ['RegularItem', 'SpecialItem'], required: true },
  quantity: { type: Number, required: true },
  availability: { type: Boolean, required: true },
}, { timestamps: true });

export default mongoose.model('DailyItem', dailyMenuSchema);