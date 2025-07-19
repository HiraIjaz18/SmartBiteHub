import  { useEffect, useState } from 'react';
import axios from 'axios';
export const url = "http://localhost:4000";
import { toast } from 'react-toastify';
import './Orders.css';


const OrdersList = () => {
    const [orders, setOrders] = useState([]);

    const fetchOrders = async () => {
        try {
            const response = await axios.get(`${url}/api/orders/orders`);
            console.log('Orders:', response.data); // Debugging log
            if (response.data.success) {
                setOrders(response.data.data);
            } else {
                console.error('Error fetching orders');
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const updateOrderStatus = async (id, status) => {
        try {
            const response = await axios.put(`${url}/api/orders/order/${id}`, { status });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchOrders();
            } else {
                toast.error('Error updating order status');
            }
        } catch (error) {
            toast.error('Error updating order status');
            console.error('Error updating order status:', error);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    return (
        <div className="orders-list">
            <h2>Orders</h2>
            <ul>
                {orders.length > 0 ? (
                    orders.map((order) => (
                        <li key={order._id}>
                            <p><strong>Item Name:</strong> {order.itemName}</p>
                            <p><strong>Quantity:</strong> {order.quantity}</p>
                            <p><strong>Total Price:</strong> ${order.totalPrice}</p>
                            <p><strong>Status:</strong> {order.status}</p>
                            <select onChange={(e) => updateOrderStatus(order._id, e.target.value)} value={order.status}>
                                <option value="Pending">Pending</option>
                                <option value="Delivered">Delivered</option>
                            </select>
                        </li>
                    ))
                ) : (
                    <p>No orders available</p>
                )}
            </ul>
        </div>
    );
};

export default OrdersList;
