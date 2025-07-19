import express from 'express';
import { createFeedback, getAllFeedback } from '../controllers/feedbackController.js';

const FeedbackRouter = express.Router();

FeedbackRouter.post('/givefeedback', createFeedback);
FeedbackRouter.get('/feedback', getAllFeedback);

export default FeedbackRouter;