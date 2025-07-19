import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './DailyMenu.css';
export const url = "http://localhost:4000";

const DailyMenu = () => {
  const [itemType, setItemType] = useState('regular');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [availability, setAvailability] = useState(true);

  const handleAddOrUpdateDailyItem = async () => {
    console.log('Request payload:', {
      itemType,
      itemName,
      quantity,
      availability
    }); // Debugging log

    try {
      const response = await axios.post(`${url}/api/daily/update`, {
        itemType,
        itemName,
        quantity,
        availability
      });

      console.log('Response:', response.data); // Log the response

      if (response.data.success) {
        toast.success(response.data.message);
        // Reset the form only if it's a successful update or addition
        setItemName('');
        setQuantity('');
        setAvailability(true);
      } else {
        toast.error('Error adding or updating daily item');
      }
    } catch (error) {
      toast.error('Error adding or updating daily item');
      console.error('Error adding or updating daily item:', error);
    }
  };

  return (
      <div className="daily-menu-form">
    <div>
      <h1>{itemName ? 'Update Daily Item' : 'Add Daily Item'}</h1>
      <div>
        <label>
          Select Item Type:
          <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
            <option value="regular">Regular</option>
            <option value="special">Special</option>
          </select>
        </label>
        <label>
          Item Name:
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Enter item name"
          />
        </label>
        <label>
          Quantity:
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
          />
        </label>
        <label>
          Availability:
          <input
            type="checkbox"
            checked={availability}
            onChange={(e) => setAvailability(e.target.checked)}
          />
        </label>
        <button onClick={handleAddOrUpdateDailyItem}>
          {itemName ? 'Update Daily Item' : 'Add Daily Item'}
        </button>
      </div>
    </div>
    </div>

  );
};

export default DailyMenu;
