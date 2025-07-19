import foodModel from "../models/foodModel.js";
import fs from 'fs';

// all food list
const listFood = async (req, res) => {
    try {
        const foods = await foodModel.find({});
        const updatedFoods = foods.map(food => ({
            ...food._doc,
            image: `${req.protocol}://${req.get('host')}/images/${food.image}`
        }));
        res.json({ success: true, data: updatedFoods });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// add food
const addFood = async (req, res) => {
    const image_filename = `${req.file.filename}`;

    const food = new foodModel({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        image: image_filename,
    });
    try {
        await food.save();
        res.json({ success: true, message: "Food Added" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};
// delete food
const removeFood = async (req, res) => {
    try {
        const food = await foodModel.findById(req.body.id);
        fs.unlink(`uploads/${food.image}`, () => {});

        await foodModel.findByIdAndDelete(req.body.id);
        res.json({ success: true, message: "Food Removed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// controllers/foodController.js
const getFoodById = async (req, res) => {
    const { id } = req.params; // Get ID from request parameters

    try {
        const food = await foodModel.findById(id);
        if (!food) {
            return res.status(404).json({ success: false, message: "Food not found" });
        }
        res.json({ success: true, data: food });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error retrieving food" });
    }
};

// Export the new function
export { listFood, addFood, removeFood, getFoodById };