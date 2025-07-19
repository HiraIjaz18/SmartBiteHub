import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
export const url = "http://localhost:4000";
import './RegularMenu.css';

const AddRegularItem = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [category, setCategory] = useState(''); // New state for category

    // Predefined categories for university cafeteria
    const categories = [
        'Breakfast',
        'Lunch',
        'Snacks',
        'Beverages',
        'Desserts',
        'Dinner'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(`${url}/api/regular/add`, {
                name,
                description,
                price,
                imageUrl,
                category // Include category in the request
            });

            if (response.data.message) {
                toast.success(response.data.message);
                setName('');
                setDescription('');
                setPrice('');
                setImageUrl('');
                setCategory(''); // Reset category
            } else {
                toast.error("Error adding item");
            }
        } catch (error) {
            toast.error("Error adding item");
            console.error('Error adding item:', error);
        }
    };

    return (
        <div className="add-regular-item">
            <h2>Add Regular Item</h2>
            <div className="form-content">
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Description:</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Price:</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Image URL:</label>
                    <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Category:</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                    >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit">Add Item</button>
                
            </form>
            </div>
        </div>
    );
};

export default AddRegularItem;
