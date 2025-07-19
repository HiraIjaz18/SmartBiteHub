import mongoose from "mongoose";

const bulkOrderSchema = new mongoose.Schema({
  items: [
    {
      
      itemName: { type: String, required: true },
      itemType: { type: String, required: true },
      quantity: { type: Number, required: true },
      itemPrice: { type: Number, required: true },
    }
  ],
  totalPrice: { type: Number, required: true },
  orderDate: { type: Date, required: true },
  pickupDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Delivered','Cancelled'],
    default: 'Pending'
  },
  token: { type: String },
  wing: { type: String, required: true },
  floor: { type: String, required: true },
  roomNumber: { type: String },orderId: { 
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId() 
  },
}, { timestamps: true });

const fBulkOrder = mongoose.models.fBulkorder || mongoose.model("fBulkorder", bulkOrderSchema);

export default fBulkOrder;