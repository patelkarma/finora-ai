import React from 'react';
import './Loader.css';

const Loader = ({ size = 'md', message = 'Loading...' }) => {
  return (
    <div className="loader-container">
      <div className={`spinner-border text-primary spinner-${size}`} role="status">
        <span className="visually-hidden">{message}</span>
      </div>
      <p className="loader-message">{message}</p>
    </div>
  );
};

export default Loader;
