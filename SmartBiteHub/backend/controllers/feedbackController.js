import Feedback from '../models/feedbackModel.js';
import { getIO } from '../services/socketServices.js';

export const createFeedback = async (req, res) => {
  try {
    let { name, email, comment } = req.body;

    // Input validation and trimming
    name = name?.trim();
    email = email?.trim();
    comment = comment?.trim();

    if (!name || !email || !comment) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const wordCount = comment.split(/\s+/).length;
    if (wordCount > 250) {
      return res.status(400).json({ message: 'Feedback should be under 250 words.' });
    }

    const feedback = new Feedback({ name, email, comment });
    await feedback.save();

    // Notify all clients in feedback room
    const io = getIO();
    if (io) {
      io.to('feedbackRoom').emit('newFeedback', {
        id: feedback._id,
        name: feedback.name,
        email: feedback.email,
        comment: feedback.comment,
        createdAt: feedback.createdAt
      });
    }

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        name: feedback.name,
        email: feedback.email,
        comment: feedback.comment,
        createdAt: feedback.createdAt
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      message: 'Error submitting feedback', 
      error: error.message 
    });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .select('name email comment createdAt');
      
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    res.status(500).json({ 
      message: 'Error retrieving feedback', 
      error: error.message 
    });
  }
};