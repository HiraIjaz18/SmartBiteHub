import React from 'react';
import { useNavigate } from 'react-router-dom';
import './sdashboard.css';

const Sdashboard = () => {
  const navigate = useNavigate();

  const handleNavigate = (role) => {
    localStorage.setItem('role', role); // Save role for sidebar condition

    if (role === 'student') {
      navigate('/add-regular-menu'); // Student starts here
    } else if (role === 'faculty') {
      navigate('/frecharge-wallet'); // Faculty starts here
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <h1 className="dashboard-title">Welcome to Smart Bite Hub</h1>
        <h1 className="dashboard-title">ADMIN</h1>
        <p className="dashboard-subtitle">Please choose a card to continue</p>
        <div className="card-container">
          <div
            className="role-card student-card"
            onClick={() => handleNavigate('student')}
          >
            <h2>Student</h2>
          </div>
          <div
            className="role-card faculty-card"
            onClick={() => handleNavigate('faculty')}
          >
            <h2>Faculty</h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sdashboard;
