import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Fbulkorder.css';

export const url = "http://localhost:4000";

const FBulkOrdersList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${url}/api/Fbulkorder/Fbulk-orders`);
            if (response.data.success) {
                setOrders(response.data.data);
            } else {
                setError('Failed to fetch orders');
                toast.error('Failed to fetch orders');
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            setError('Error fetching orders. Please try again.');
            toast.error('Error fetching orders');
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (id, status) => {
        try {
            const response = await axios.put(`${url}/api/Fbulkorder/${id}`, { status });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchOrders();
            } else {
                toast.error(response.data.message || 'Error updating order status');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating order status');
            console.error('Error updating order status:', error);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) return <div className="loading">Loading orders...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="fbulk-orders-container">
            <h2>Bulk Orders</h2>
            <div className="orders-grid">
                {orders.length > 0 ? (
                    orders.map((order) => (
                        <div key={order._id} className="order-card">
                            <h3>Order #{order._id.slice(-6).toUpperCase()}</h3>
                            <div className="order-details">
                                <p><strong>Items:</strong></p>
                                <ul>
                                    {order.items.map((item, index) => (
                                        <li key={index}>
                                            {item.itemName} (Qty: {item.quantity})
                                        </li>
                                    ))}
                                </ul>
                                <p><strong>Total Price:</strong> ${order.totalPrice.toFixed(2)}</p>
                                <p><strong>Delivery Info:</strong> {order.wing}, Floor {order.floor}, Room {order.roomNumber}</p>
                                <p><strong>Status:</strong> <span className={`status-${order.status.toLowerCase()}`}>{order.status}</span></p>
                            </div>
                            <div className="order-actions">
                                <select 
                                    onChange={(e) => updateOrderStatus(order._id, e.target.value)} 
                                    value={order.status}
                                    disabled={order.status === 'Delivered'}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Delivered">Delivered</option>
                                </select>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="no-orders">No orders available</p>
                )}
            </div>
        </div>
    );
};

export default FBulkOrdersList;