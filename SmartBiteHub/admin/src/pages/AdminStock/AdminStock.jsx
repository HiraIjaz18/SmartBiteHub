import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
export const url = "http://localhost:4000";
import "./AdminStock.css";

const AdminStock = () => {
  const [items, setItems] = useState([{ name: "", quantity: "" }]);

  const handleInputChange = (index, event) => {
    const newItems = [...items];
    newItems[index][event.target.name] = event.target.value;
    setItems(newItems);
  };

  const addNewItem = () => {
    setItems([...items, { name: "", quantity: "" }]);
  };

  const submitStock = async () => {
    try {
      const response = await axios.post(`${url}/api/admin/stock`, { items });

      if (response.data.success) {
        toast.success("Stock updated successfully!");
        setItems([{ name: "", quantity: "" }]); // Reset form
      } else {
        toast.error("Error updating stock!");
      }
    } catch (error) {
      toast.error("Stock update failed!");
      console.error("Error:", error);
    }
  };

  return (
    <div className="admin-stock">
      <h2>Enter Todays Stock</h2>
      {items.map((item, index) => (
        <div key={index} className="stock-item">
          <input
            type="text"
            name="name"
            value={item.name}
            onChange={(e) => handleInputChange(index, e)}
            placeholder="Enter Item Name"
          />
          <input
            type="number"
            name="quantity"
            value={item.quantity}
            onChange={(e) => handleInputChange(index, e)}
            placeholder="Enter Quantity"
          />
        </div>
      ))}
      <button onClick={addNewItem}>➕ Add More Items</button>
      <button onClick={submitStock}>📤 Send to Chef</button>
    </div>
  );
};

export default AdminStock;
