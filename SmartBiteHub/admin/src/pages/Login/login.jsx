import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types'; // Import PropTypes
export const url = "http://localhost:4000";

import './login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${url}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token); // Store token
        onLogin(); // Call the onLogin function passed from App
        navigate('/SDashboard'); // ← You can change this to wherever your dashboard is
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('Unable to login. Please try again later.');
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLoginSubmit}>
      <h2>Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
        <p className="linkText" onClick={() => navigate('/signup')}>
          Don’t have an account? Sign up
        </p>
      </form>
    </div>
  );
};

Login.propTypes = {
  onLogin: PropTypes.func.isRequired, // Add prop type validation
};

export default Login;
