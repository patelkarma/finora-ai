import React from 'react';
import './formInput.css';

const FormInput = ({ label, type = 'text', value, onChange, error, placeholder, required = false, ...props }) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input
        type={type}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value || ''} // Ensure value is never undefined
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        {...props}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};

export default FormInput;

