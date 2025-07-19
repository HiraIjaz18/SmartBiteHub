import mongoose from 'mongoose';
const orderSchema = new mongoose.Schema({
  items: [
    {
      itemName: { type: String, required: true },
      itemType: { type: String, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  email: {  // Add this field
    type: String,
    required: true
  },
  totalPrice: { type: Number, required: true },
  orderDate: { type: Date, required: true },
  status: { type: String, default: 'Pending' },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  userType: { type: String, required: true },
 // Use hex code as the token
});

export default mongoose.model('Order', orderSchema);