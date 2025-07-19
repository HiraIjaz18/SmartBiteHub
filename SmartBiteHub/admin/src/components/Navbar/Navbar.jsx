import { useState } from 'react';
import './Navbar.css';
import { assets } from '../../assets/assets';

const Navbar = ({ setSearchQuery }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    setSearchQuery(searchTerm.toLowerCase());
  };

  return (
    <div className="navbar">
      {/* Enlarged Logo */}
      <img className="logo" src={assets.logo} alt="Logo" />


      {/* Search Bar + Profile */}
      <div className="profile-container">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={handleSearch}>🔍</button>
        </div>

        {/* Enlarged Profile Image */}
        <img className="profile" src={assets.profile_image} alt="Profile" />
      </div>
    </div>
  );
};

export default Navbar;
