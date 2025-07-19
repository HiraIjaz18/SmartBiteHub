import express from 'express';
import { loginFaculty, registerFaculty,getFacultyDetails } from '../facultyControllers/facultyController.js'; // Ensure you import your controller correctly

const facultyRouter = express.Router();

facultyRouter.post('/Flogin', loginFaculty); // Login route for faculty
facultyRouter.post('/Fregister', registerFaculty); // Registration route for faculty
facultyRouter.get('/faculty/:email', getFacultyDetails); // Get faculty details route
export default facultyRouter;
