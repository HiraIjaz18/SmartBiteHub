import RegularItem from '../models/regularMenuModel.js';

// Add a new regular item with category
export const addRegularItem = async (req, res) => {
  const { name, description, price, imageUrl, category } = req.body;

  if (!category) {
    return res.status(400).json({ message: 'Category is required' });
  }

  try {
    const newItem = new RegularItem({ name, description, price, imageUrl, category });
    await newItem.save();
    res.status(201).json({ message: 'Regular item added successfully', item: newItem });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add regular item', error });
  }
};

export const getRegularItems = async (req, res) => {
  try {
    const items = await RegularItem.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch regular items', error });
  }
};