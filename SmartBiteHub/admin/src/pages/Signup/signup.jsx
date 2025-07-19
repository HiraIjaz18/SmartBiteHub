import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
export const url = "http://localhost:4000";
import './Signup.css';

const SignupScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    if (name.length < 3) {
      alert('Name must be at least 3 characters.');
      return;
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }

    try {
      const response = await fetch(`${url}/api/admin/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Account created successfully.');
        navigate('/login');
      } else if (data.message === 'User already exists') {
        alert('User already exists.');
      } else {
        alert(data.message || 'Something went wrong.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('Unable to register. Please try again later.');
    }
  };

  return (
    <div className="signup-container">
      
      <form className="signup-form" onSubmit={handleSignupSubmit}>
      <h2>Sign Up</h2>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
        <button type="submit">Sign Up</button>
        <p className="linkText">
          Already have an account?{' '}
          <span
            onClick={() => navigate('/')}
            style={{
              textDecoration: 'underline',
              cursor: 'pointer',
              color: '#007bff',
            }}
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
export default SignupScreen;
