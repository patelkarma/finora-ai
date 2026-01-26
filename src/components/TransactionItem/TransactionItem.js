import React from 'react';
import { formatDate } from '../../utils/formatDate';
import './TransactionItem.css';

const TransactionItem = ({ transaction, onEdit, onDelete }) => {
  if (!transaction) return null;

  const { id, transactionDate, description, category, amount, type } = transaction;

  const isIncome = type === 'income';
  const sign = isIncome ? '+' : '-';
  const amountClass = isIncome ? 'text-success' : 'text-danger';

  return (
    <tr className="transaction-item">
      <td>{formatDate(transactionDate)}</td>
      <td>{description || 'N/A'}</td>
      <td>
        <span className="badge bg-secondary">
          {category || 'N/A'}
        </span>
      </td>

      {/* ✅ Single, correct amount column */}
      <td className={amountClass}>
        {sign}₹{Math.abs(amount || 0).toFixed(2)}
      </td>

      <td>
        <button
          className="btn btn-sm btn-outline-primary me-2"
          onClick={() => onEdit(transaction)}
        >
          <i className="fas fa-edit"></i> Edit
        </button>
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => onDelete(id)}
        >
          <i className="fas fa-trash"></i> Delete
        </button>
      </td>
    </tr>
  );
};

export default TransactionItem;
