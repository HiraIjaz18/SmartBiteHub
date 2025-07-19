import express from 'express';
import {
  createNotification,
  getUserNotifications,
  markAsRead
} from '../facultyControllers/notificationController.js'

const notificationrouter = express.Router();

notificationrouter.post('/notification', createNotification);
notificationrouter.get('/user/:userId', protect, getUserNotifications);
notificationrouter.put('/:notificationId/read', protect, markAsRead);

export default notificationrouter;