import React from 'react';
import BudgetItem from '../BudgetItem/BudgetItem';
import './BudgetList.css';

const BudgetList = ({ budgets, onEdit, onDelete }) => {
  if (!budgets || budgets.length === 0) {
    return <div className="no-data">No budgets set. Create one to manage your spending!</div>;
  }

  return (
    <div className="budget-list">
      {budgets.map(budget => (
        <BudgetItem key={budget.id} budget={budget} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
};

export default BudgetList;

