import React, { useEffect } from 'react';
import './BudgetItem.css';

const BudgetItem = ({ budget, onEdit, onDelete }) => {
  useEffect(() => {
    // Debug log to verify budget data
    console.log('[BudgetItem] budget prop:', budget);
  }, [budget]);

  if (!budget) {
    return (
      <div className="card budget-item">
        <div className="card-body">
          <h5 className="card-title">No budget data</h5>
        </div>
      </div>
    );
  }

  const { id, category = 'Unknown Category', amount = 0, period = 'N/A', spent = 0 } = budget;

  // Ensure values are numbers
  const total = Number(amount);
  const used = Number(spent);

  // Calculate progress accurately and cap at 100%
  const progress = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  // Dynamic color logic
  let progressColor = '#28a745'; // green
  if (progress >= 75) progressColor = '#dc3545'; // red
  else if (progress >= 50) progressColor = '#ffc107'; // yellow

  return (
    <div className="card budget-item shadow-sm mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">{category}</h5>
          <h6 className="card-subtitle text-muted">
            ₹{used.toFixed(2)} / ₹{total.toFixed(2)}
          </h6>
        </div>

        {/* Progress Bar */}
        <div className="progress" style={{ height: '18px', borderRadius: '10px', backgroundColor: '#e9ecef' }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{
              width: `${progress}%`,
              backgroundColor: progressColor,
              transition: 'width 0.6s ease-in-out',
              color: '#fff',
              fontWeight: '500',
              textAlign: 'center',
              borderRadius: '10px'
            }}
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {Math.round(progress)}%
          </div>
        </div>

        <p className="card-text mt-2">
          Period: {period}
        </p>

        <div className="d-flex justify-content-between mt-3">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onEdit && onEdit(budget)}
          >
            <i className="fas fa-edit me-1"></i>Edit
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDelete && onDelete(id)}
          >
            <i className="fas fa-trash me-1"></i>Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetItem;




