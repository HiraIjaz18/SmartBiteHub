import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Feedback.css';
export const url = "http://localhost:4000";
const Feedback = () => {
    const [feedbackList, setFeedbackList] = useState([]); // Default to an empty array

    // Fetch feedback data from the API
    const fetchFeedback = async () => {
        try {
            const response = await axios.get(`${url}/api/feedback/getfeedback`);
            console.log('Feedback Data:', response.data); // Debugging log

            // Validate API response format
            if (Array.isArray(response.data)) {
                setFeedbackList(response.data);
            } else {
                console.error('API did not return an array');
                toast.error('Failed to fetch feedback. Please try again later.');
                setFeedbackList([]); // Default to an empty array on invalid response
            }
        } catch (error) {
            console.error('Error retrieving feedback:', error);
            toast.error('Error retrieving feedback. Please check your connection.');
            setFeedbackList([]); // Fallback to an empty array on error
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, []);

    return (
        <div className="feedback-container">
            <h2>User Feedback</h2>
            <ul>
                {feedbackList.length > 0 ? (
                    feedbackList.map((feedback) => (
                        <li key={feedback._id} className="feedback-item">
                            <p><strong>Name:</strong> {feedback.name}</p>
                            <p><strong>Email:</strong> {feedback.email}</p>
                            <p><strong>Comment:</strong> {feedback.comment}</p>
                            <p className="timestamp">{new Date(feedback.createdAt).toLocaleString()}</p>
                        </li>
                    ))
                ) : (
                    <p>No feedback available.</p>
                )}
            </ul>
        </div>
    );
};

export default Feedback;
