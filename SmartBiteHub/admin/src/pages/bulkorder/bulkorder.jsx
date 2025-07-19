import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './bulkorder.css';

export const url = "http://localhost:4000";

const BulkOrdersList = () => {
    const [orders, setOrders] = useState([]);

    const fetchOrders = async () => {
        try {
            const response = await axios.get(`${url}/api/bulkorder/bulkorderlist`);
            if (response.data.success) {
                setOrders(response.data.data);
            } else {
                toast.error('Error fetching orders');
            }
        } catch (error) {
            toast.error('Error fetching orders');
            console.error('Error:', error);
        }
    };

    const updateOrderStatus = async (id, status) => {
        try {
            const response = await axios.put(`${url}/api/bulkorder/bulk-orders/${id}`, { status });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchOrders();
            } else {
                toast.error(response.data.error || 'Error updating order status');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error updating order status');
            console.error('Error:', error);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Format date for display
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div className="bulk-orders-list">
            <h2>Bulk Orders</h2>
            <div className="orders-container">
                {orders.length > 0 ? (
                    orders.map((order) => (
                        <div key={order._id} className="order-card">
                            <h3>Order #{order.token}</h3>
                            <p><strong>Order Date:</strong> {formatDate(order.orderDate)}</p>
                            
                            <div className="items-list">
                                <h4>Items:</h4>
                                {order.items.map((item, index) => (
                                    <div key={index} className="item">
                                        <p><strong>Name:</strong> {item.itemName}</p>
                                        <p><strong>Quantity:</strong> {item.quantity}</p>
                                     
                                    </div>
                                ))}
                            </div>
                            
                            <p><strong>Total Price:</strong> Rs{order.totalPrice.toFixed(2)}</p>
                            <div className="status-control">
                                <p><strong>Status:</strong></p>
                                <select 
                                    onChange={(e) => updateOrderStatus(order._id, e.target.value)} 
                                    value={order.status}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Delivered">Delivered</option>
                                 
                                </select>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No orders available</p>
                )}
            </div>
        </div>
    );
};

export default BulkOrdersList;