import  { useEffect, useState } from 'react';
import axios from 'axios';
export const url = "http://localhost:4000";
import { toast } from 'react-toastify';
import './List.css'

const List = () => {
    const [dailyItems, setDailyItems] = useState([]);

    const fetchDailyItems = async () => {
        try {
            const response = await axios.get(`${url}/api/daily/menu-items`);
            console.log('Daily Menu Items:', response.data); // Debugging log
            if (response.data.success) {
                setDailyItems(response.data.data);
            } else {
                console.error('Error fetching daily items');
            }
        } catch (error) {
            console.error('Error fetching daily items:', error);
        }
    };

    const deleteItem = async (id) => {
        try {
            const response = await axios.delete(`${url}/api/daily/delete/${id}`);
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDailyItems();
            } else {
                toast.error('Error deleting item');
            }
        } catch (error) {
            toast.error('Error deleting item');
            console.error('Error deleting item:', error);
        }
    };

    useEffect(() => {
        fetchDailyItems();
    }, []);

    return (
        <div className="daily-menu">
            <h2>Todays Daily Menu</h2>
            <ul>
                {dailyItems.length > 0 ? (
                    dailyItems.map((item) => (
                        <li key={item._id}>
                            <img src={item.imageUrl} alt={item.name} style={{ width: '100px', height: '100px' }} />
                            <p><strong>Name:</strong> {item.name}</p>
                            <p><strong>Type:</strong> {item.itemType}</p>
                            <p><strong>Quantity:</strong> {item.quantity}</p>
                            <p><strong>Price:</strong> ${item.price}</p>
                            <p><strong>Description:</strong> {item.description}</p>
                            <p><strong>Availability:</strong> {item.availability ? 'Available' : 'Not Available'}</p>
                            <button onClick={() => deleteItem(item._id)}>Delete</button>
                        </li>
                    ))
                ) : (
                    <p>No items available</p>
                )}
            </ul>
        </div>
    );
};

export default List;
