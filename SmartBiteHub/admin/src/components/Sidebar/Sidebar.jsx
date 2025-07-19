import './Sidebar.css';
import { assets } from '../../assets/assets';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const role = localStorage.getItem('role'); // Get the saved role

  return (
    <div className='sidebar'>
      <div className="sidebar-options">
        <NavLink to='/add-regular-menu' className="sidebar-option">
          <img src={assets.add_icon} alt="Add Icon" />
          <p>Add Regular Menu</p>
        </NavLink>

        <NavLink to='/add-special-menu' className="sidebar-option">
          <img src={assets.add_icon} alt="Add Icon" />
          <p>Add Special Menu</p>
        </NavLink>

        <NavLink to='/add-daily-menu' className="sidebar-option">
          <img src={assets.add_icon} alt="Add Icon" />
          <p>Add Daily Menu</p>
        </NavLink>

        <NavLink to='/list' className="sidebar-option">
          <img src={assets.order_icon} alt="Order Icon" />
          <p>List Items</p>
        </NavLink>

        <NavLink to='/orders' className="sidebar-option">
          <img src={assets.order_icon} alt="Order Icon" />
          <p>Orders</p>
        </NavLink>

        {/* Faculty or Student specific options */}
        {role === 'faculty' ? (
          <>
            <NavLink to='/frecharge-wallet' className="sidebar-option">
              <img src={assets.order_icon} alt="Order Icon" />
              <p>Recharge Wallet</p>
            </NavLink>

            <NavLink to='/fbulk-orders-list' className="sidebar-option">
              <img src={assets.order_icon} alt="Order Icon" />
              <p>Bulk Orders</p>
            </NavLink>

            <NavLink to='/fpre-orders-list' className="sidebar-option">
              <img src={assets.order_icon} alt="Order Icon" />
              <p>Pre Orders</p>
            </NavLink>
          </>
        ) : (
          <>
            {/* Student Role */}
            <NavLink to='/recharge-wallet' className="sidebar-option">
              <img src={assets.order_icon} alt="Order Icon" />
              <p>Recharge Wallet</p>
            </NavLink>

            <NavLink to='/bulk-orders-list' className="sidebar-option">
              <img src={assets.order_icon} alt="Order Icon" />
              <p>Bulk Orders</p>
            </NavLink>

            <NavLink to='/pre-orders-list' className="sidebar-option">
              <img src={assets.order_icon} alt="Order Icon" />
              <p>Pre Orders</p>
            </NavLink>
          </>
        )}

        {/* Common links for everyone */}
        <NavLink to='/feedback' className="sidebar-option">
          <img src={assets.order_icon} alt="Order Icon" />
          <p>Feedback</p>
        </NavLink>
        <NavLink to='/admin-stock' className="sidebar-option">
          <img src={assets.order_icon} alt="Order Icon" />
          <p>Stock</p>
        </NavLink>
      </div>

    </div>
  );
};

export default Sidebar;
