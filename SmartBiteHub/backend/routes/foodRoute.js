import express from 'express';
import { addFood, listFood, removeFood, getFoodById } from '../controllers/foodController.js'; // Import the new controller function
import multer from 'multer';

const foodRouter = express.Router();

// Image Storage Engine (Saving Image to uploads folder & rename it)
const storage = multer.diskStorage({
    destination: 'uploads',
    filename: (req, file, cb) => {
        return cb(null, `${Date.now()}${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

foodRouter.get("/list", listFood);
foodRouter.get("/:id", getFoodById); // New route for getting food by ID
foodRouter.post("/add", upload.single('image'), addFood);
foodRouter.post("/remove", removeFood);

export default foodRouter;
