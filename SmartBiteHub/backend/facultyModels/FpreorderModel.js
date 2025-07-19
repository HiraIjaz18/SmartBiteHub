import mongoose from "mongoose";

const preOrderSchema = new mongoose.Schema({
  items: [
    {
      itemName: { type: String, required: true },
      itemType: { type: String, required: true },
      quantity: { type: Number, required: true },
      itemPrice: { type: Number, required: true },
    }
  ],
  totalPrice: { type: Number, required: true },
  deliveryDate: { type: Date, required: true }, // Date part only
  deliveryTime: { type: String, required: true }, // Time string like "14:30"
  status: { 
    type: String, 
    enum: ['Pending', 'Completed','Cancelled'], 
    default: 'Pending' 
  },
  jwtToken: { type: String },
  wing: { type: String, required: true },
  floor: { type: String, required: true },
  roomNumber: { type: String, required: true },
  notificationSent: { type: Boolean, default: false },
  attendantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For socket targeting
}, { timestamps: true });

// Virtual for combined datetime
preOrderSchema.virtual('deliveryDateTime').get(function() {
  const [hours, minutes] = this.deliveryTime.split(':').map(Number);
  const date = new Date(this.deliveryDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
});

const FPreOrder = mongoose.models.FPreOrder || mongoose.model("FPreOrder", preOrderSchema);
export default FPreOrder;