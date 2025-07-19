import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import RegularMenu from './pages/RegularMenu/RegularMenu';
import SpecialMenu from './pages/SpecialMenu/SpecialMenu';
import DailyMenu from './pages/DailyMenu/DailyMenu';
import List from './pages/List/List';
import RechargeWallet from './pages/Rechargewallet/Rechargewallet';
import Orders from './pages/Orders/Orders';
import FRechargeWallet from './pages/FRechargewallet/FRechargewallet';
import SignupScreen from './pages/Signup/signup';
import Sdashboard from './pages/SDashboard/Sdashboard';
import Feedback from './pages/Feedback/Feedback';
import Login from './pages/Login/login';
import BulkOrder from './pages/bulkorder/bulkorder';
import Fbulkorder from './pages/Fbulkorder/Fbulkorder';
import Preorder from './pages/preorder/preorder';
import FPreorder from './pages/Fpreorder/Fpreorder';
import AdminStock from './pages/AdminStock/AdminStock'; 
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage =
  location.pathname === '/' ||
  location.pathname === '/signup' ||
  location.pathname === '/SDashboard';

  const handleLogin = () => {
    // After successful login, navigate to desired page
    navigate('/signup');
  };
  return (
    <div className='app'>
      <ToastContainer />
      
      {!isAuthPage && <Navbar />}
      {!isAuthPage && <hr />}
      
      <div className="app-content">
        {!isAuthPage && <Sidebar />}

        <Routes>
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/SDashboard" element={<Sdashboard />} />
          <Route path="/recharge-wallet" element={<RechargeWallet />} />
          <Route path="/add-regular-menu" element={<RegularMenu />} />
          <Route path="/add-special-menu" element={<SpecialMenu />} />
          <Route path="/add-daily-menu" element={<DailyMenu />} />
          <Route path="/list" element={<List />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/frecharge-wallet" element={<FRechargeWallet />} />
          <Route path="/fbulk-orders-list" element={<Fbulkorder />} />
          <Route path="/admin-stock" element={<AdminStock />} />
          <Route path="/bulk-orders-list" element={<BulkOrder />} />
          <Route path="/fpre-orders-list" element={<FPreorder/>} />    
          <Route path="/pre-orders-list" element={<Preorder />} />
                    <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
