import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
export const url = "http://localhost:4000";
import './SpecialMenu.css';

const AddSpecialItem = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            console.log('Adding special item:', { name, description, price, imageUrl }); // Debugging log
            const response = await axios.post(`${url}/api/special/add`, {
                name,
                description,
                price,
                imageUrl
            });
            console.log('API response:', response); // Debugging log

            if (response.data.success) {
                toast.success(response.data.message);
                setName('');
                setDescription('');
                setPrice('');
                setImageUrl('');
            } else {
                toast.error(response.data.message || "Error adding special item");
            }
        } catch (error) {
            toast.error(error.response?.data.message || "Error adding special item");
            console.error('Error adding special item:', error);
        }
    };

    return (
        <div className="add-special-item">
           <h2>Add Special Item</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Name:</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                    <label>Description:</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>
                <div>
                    <label>Price:</label>
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
                <div>
                    <label>Image URL:</label>
                    <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required />
                </div>
                <button type="submit">Add Item</button>
            </form>
        </div>
    );
};

export default AddSpecialItem;
