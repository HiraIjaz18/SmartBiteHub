import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String, 
    required: true,
    ref: 'User'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FOrder'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['status', 'time', 'system'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;