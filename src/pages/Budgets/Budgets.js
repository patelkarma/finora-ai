import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import budgetService from '../../services/budgetService';
import BudgetList from '../../components/BudgetList/BudgetList';
import Modal from '../../components/Modal/Modal';
import FormInput from '../../components/formInput/formInput';
import Button from '../../components/Button/Button';
import Loader from '../../components/Loader/Loader';
import Alert from '../../components/Alert/Alert';
import './Budgets.css';

const Budgets = () => {
  const { user, loading } = useContext(AuthContext); // Add loading
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category: '', amount: '', period: 'monthly' });
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login'); // Redirect if not logged in
      return;
    }
    if (user) {
      fetchBudgets();
    }
  }, [user, loading, navigate]);

  const fetchBudgets = async () => {
    try {
      const data = await budgetService.getAllBudgets(user.id);
      setBudgets(data);
      console.log('[Budgets] fetched budgets:', data); // <-- add this line
    } catch (err) {
      setError('Failed to load budgets.');
    } finally {
      setLoadingBudgets(false);
    }
  };


  const handleAdd = () => {
    setEditing(null);
    setForm({ category: '', amount: '', period: 'monthly' });
    setModalOpen(true);
  };

  const handleEdit = (budget) => {
    setEditing(budget);
    setForm({
      category: budget.category,
      amount: budget.amount,
      period: budget.period,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await budgetService.deleteBudget(id);
      fetchBudgets();
    } catch (err) {
      setError('Failed to delete budget.');
    }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await budgetService.updateBudget(editing.id, form);
      } else {
        await budgetService.addBudget({ ...form, userId: user.id });
      }
      setModalOpen(false);
      fetchBudgets();
    } catch (err) {
      setError('Failed to save budget.');
    }
  };

  if (loading || loadingBudgets) return <Loader message="Loading budgets..." />;
  if (error) return <Alert type="danger" message={error} />;

  return (
    <div className="budgets">
      <h1>Budgets</h1>
      <Button onClick={handleAdd} className="mb-3">Add Budget</Button>
      <BudgetList budgets={budgets} onEdit={handleEdit} onDelete={handleDelete} />
      <Modal isOpen={modalOpen} title={editing ? 'Edit Budget' : 'Add Budget'} onClose={() => setModalOpen(false)}>
        <FormInput
          label="Category"
          name="category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Enter category"
          required
        />
        <FormInput
          label="Amount"
          type="number"
          name="amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="Enter amount"
          required
        />
        <FormInput
          label="Period"
          name="period"
          value={form.period}
          onChange={(e) => setForm({ ...form, period: e.target.value })}
          placeholder="Select period"
          required
        />
        <Button onClick={handleSave} variant="success">Save</Button>
      </Modal>
    </div>
  );
};

export default Budgets;
