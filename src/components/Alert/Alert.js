import React from 'react';
import './Alert.css';

const Alert = ({ type = 'info', message, onClose, dismissible = true }) => {
  if (!message) return null; // Don't render if no message to avoid errors

  return (
    <div className={`alert alert-${type} ${dismissible ? 'alert-dismissible fade show' : ''}`} role="alert">
      {message}
      {dismissible && onClose && (
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
      )}
    </div>
  );
};

export default Alert;
