import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  items: [
    {
      itemName: { type: String, required: true },
      itemType: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  totalPrice: { type: Number, required: true },
  orderDate: { type: Date, required: true },
  status: { type: String, default: 'pending' },
  token: { type: String, required: true },
  wing: String,
  floor: { type: String, required: true },
  roomNumber: String,
  facultyEmail: { type: String, required: true },
  preparationStart: Date,
  deliveryTime: { type: Number, required: true },
  deliveryStart: Date,
  estimatedDeliveryTime: Date,
  cancellationTime: Date,
  timeline: {
    
    preparationEnd: { type: Date, required: true },
    deliveryEnd: { type: Date, required: true }
  }
}, { 
  timestamps: true 
});

const FOrder = mongoose.models.FOrder || mongoose.model('FOrder', orderSchema);
export default FOrder;