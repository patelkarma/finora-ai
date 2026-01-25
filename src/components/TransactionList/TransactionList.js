import React from 'react';
import TransactionItem from '../TransactionItem/TransactionItem';
import './TransactionList.css';

const TransactionList = ({ transactions, onEdit, onDelete }) => {
  if (!transactions || transactions.length === 0) {
    return <div className="no-data">No transactions found. Add one to get started!</div>;
  }

  return (
    <div className="transaction-list">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <TransactionItem key={tx.id} transaction={tx} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionList;
