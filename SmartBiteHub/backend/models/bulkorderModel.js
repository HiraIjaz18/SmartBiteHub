import mongoose from "mongoose";

const bulkOrderSchema = new mongoose.Schema({
  items: [
    {
      itemName: { type: String, required: true },
      itemType: { type: String, required: true },
      quantity: { type: Number, required: true },
      itemPrice: { type: Number, required: true }, // Price per item
    }
  ],
  email: {  // Add this field
    type: String,
    required: true
  },
  totalPrice: { type: Number, required: true }, // Total price for all items
  orderDate: { type: Date, required: true }, // Date of placing the order
  status: { type: String, enum: ['Pending', 'Delivered','Cancelled'], default: 'Pending' },
  token: { type: String } ,
  createdAt: { type: Date, default: Date.now },// Remove required: true
}, { timestamps: true });

const BulkOrder = mongoose.models.Bulkorder || mongoose.model("Bulkorder", bulkOrderSchema);

export default BulkOrder;