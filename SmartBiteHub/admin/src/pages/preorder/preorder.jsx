import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './preorder.css';

export const url = "http://localhost:4000";

const PreordersList = () => {
    const [orders, setOrders] = useState([]);

    const fetchOrders = async () => {
        try {
            const response = await axios.get(`${url}/api/preorder/preorderlist`);
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
            const response = await axios.put(`${url}/api/preorder/preorder/${id}`, { status });
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

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div className="pre-orders-container">
            <div className="header-section">
                <h2>Pre Orders</h2>
                <button onClick={fetchOrders} className="refresh-btn">
                    Refresh Orders
                </button>
            </div>
            
            <div className="orders-grid">
                {orders.length > 0 ? (
                    orders.map((order) => (
                        <div key={order._id} className="order-card">
                            <div className="order-header">
                                <h3>Order #{order.token}</h3>
                                <span className={`status-badge ${order.status.toLowerCase().replace(' ', '-')}`}>
                                    {order.status}
                                </span>
                            </div>
                            
                            <div className="order-details">

                                <p><strong>Order Date:</strong> {formatDate(order.orderDate)}</p>
                                
                                <div className="items-section">
                                    <h4>Items:</h4>
                                    {order.items.map((item, index) => (
                                        <div key={index} className="item-row">
                                            <span className="item-name">{item.itemName}</span>
                                            <span className="item-qty">x{item.quantity}</span>
                                            <span className="item-price">${item.itemPrice?.toFixed(2) || '0.00'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="order-footer">
                                <p className="total-price">Total: ${order.totalPrice?.toFixed(2) || '0.00'}</p>
                                <div className="status-control">
                                    <label htmlFor={`status-${order._id}`}>Update Status:</label>
                                    <select
                                        id={`status-${order._id}`}
                                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                                        value={order.status}
                                        className="status-select"
                                    >
                                        <option value="Pending">Pending</option>
                                      
                                        <option value="Delivered">Delivered</option>
                                       
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-orders">
                        <p>No orders available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreordersList;