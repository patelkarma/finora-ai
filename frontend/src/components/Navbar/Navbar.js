// import React, { useContext } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { AuthContext } from '../../context/AuthContext';
// import './Navbar.css';
// import logo from '../../assets/images/logo.png'; //

// const Navbar = () => {
//   const { user, logout } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   return (
//     <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow">
//       <div className="container-fluid">
//         <Link className="navbar-brand d-flex align-items-center" to="/dashboard">
//           <img src={logo} alt="FinDash Logo" className="navbar-logo me-2" />
//           Finora AI
//         </Link>
//         {/* Finora AI :- Finance + Aura = finora */}

//         <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
//           <span className="navbar-toggler-icon"></span>
//         </button>
//         <div className="collapse navbar-collapse" id="navbarNav">
//           {user ? (
//             <ul className="navbar-nav ms-auto">
//               <li className="nav-item">
//                 <Link className="nav-link" to="/profile">
//                   <i className="fas fa-user me-1"></i>{user.name}
//                 </Link>
//               </li>
//               <li className="nav-item">
//                 <button className="btn btn-link nav-link" onClick={handleLogout}>
//                   <i className="fas fa-sign-out-alt me-1"></i>Logout
//                 </button>
//               </li>
//             </ul >
//           ) : (
//             <ul className="navbar-nav ms-auto">
//               <li className="nav-item" style={{ color: "white" }}>
//                 <Link className="nav-link" to="/login">🔐 Login</Link>
//               </li>
//               <li className="nav-item">
//                 <Link className="nav-link" to="/signup">📝 Signup</Link>
//               </li>
//             </ul>
//           )}
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;


import React, { useContext, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./Navbar.css";
import logo from "../../assets/images/logo.png";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="top-navbar">
      <div className="nav-left">
        <Link to="/dashboard" className="brand">
          <img src={logo} className="brand-logo" alt="logo" />
          <span>Finora AI</span>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <ul className="nav-links">
        <li><NavLink to="/dashboard"><span>🖥️</span> Dashboard</NavLink></li>
        <li><NavLink to="/transactions"><span>💰</span> Transactions</NavLink></li>
        <li><NavLink to="/budgets"><span>💹</span> Budgets</NavLink></li>
        <li><NavLink to="/ai-insights"><span>🧠</span> Insights</NavLink></li>
        <li><NavLink to="/profile"><span>👱‍♀️</span> Profile</NavLink></li>
      </ul>

      {/* Profile Section (Right Side) */}
      <div className="profile-area">
        <div
          className="profile-icon"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          👤
        </div>

        {profileOpen && (
          <div className="profile-dropdown">
            <p className="profile-name">{user?.name}</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? "✖" : "☰"}
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <ul className="mobile-menu">
          <li><NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>🖥️ Dashboard</NavLink></li>
          <li><NavLink to="/transactions" onClick={() => setMenuOpen(false)}>💰 Transactions</NavLink></li>
          <li><NavLink to="/budgets" onClick={() => setMenuOpen(false)}>💹 Budgets</NavLink></li>
          <li><NavLink to="/ai-insights" onClick={() => setMenuOpen(false)}>🧠 Insights</NavLink></li>
          <li><NavLink to="/profile" onClick={() => setMenuOpen(false)}>👱‍♀️ Profile</NavLink></li>
        </ul>
      )}
    </nav>
  );
};

export default Navbar;
