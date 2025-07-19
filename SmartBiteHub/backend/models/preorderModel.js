import mongoose from "mongoose";

const preOrderSchema = new mongoose.Schema({
  items: [
    {
      itemName: { type: String, required: true },
      itemType: { type: String, required: true },
      quantity: { type: Number, required: true },
      itemPrice: { type: Number, required: true }, // Price per item
    }
  ],
  totalPrice: { type: Number, required: true }, 
  email: {  // Add this field
    type: String,
    required: true
  },// Total price for all items
  orderDate: { type: Date, required: true }, // Date for which the pre-order is placed (must be in the future)
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Pending'
  },// Status of the pre-order // Reference to the user placing the pre-order
  token: { type: String }, 
  createdAt: { type: Date, default: Date.now },// Token to identify or validate the order
}, { timestamps: true });
export default mongoose.model('PreOrder', preOrderSchema);