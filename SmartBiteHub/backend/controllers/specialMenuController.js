import SpecialItem from '../models/specialMenuModel.js';

export const addSpecialItem = async (req, res) => {
  const { name, description, price, imageUrl } = req.body;

  try {
    const newItem = new SpecialItem({ name, description, price, imageUrl });
    await newItem.save();
    res.status(201).json({ message: 'Special item added successfully', item: newItem });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add special item', error });
  }
};

export const getSpecialItems = async (req, res) => {
  try {
    const items = await SpecialItem.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch special items', error });
  }
};