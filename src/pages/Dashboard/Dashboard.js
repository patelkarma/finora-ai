import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import transactionService from '../../services/transactionService';
import TransactionList from '../../components/TransactionList/TransactionList';
import Chart from '../../components/Chart/Chart';
import Loader from '../../components/Loader/Loader';
import Alert from '../../components/Alert/Alert';
import FormInput from '../../components/formInput/formInput';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal'; // ✅ Added
import './Dashboard.css';

const Dashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState(null);
  const [incomeEntered, setIncomeEntered] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: '', category: 'Salary', transactionDate: new Date().toISOString().split('T')[0] });

  // ✅ Added for edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ description: '', amount: '', category: '', transactionDate: new Date().toISOString().split('T')[0] });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      checkIncome();
    }
  }, [user, loading, navigate]);

  const checkIncome = async () => {
    try {
      const data = await transactionService.getRecentTransactions(user.id);
      const hasIncome = data.some(t => t.type === 'income');
      setIncomeEntered(hasIncome);
      if (hasIncome) {
        const transactionsWithSign = data.map(t => ({
          ...t,
          sign: t.type === 'income' ? '+' : '-'
        }));
        setTransactions(transactionsWithSign);
      }
    } catch (err) {
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleIncomeSave = async () => {
    try {
      await transactionService.addTransaction({
        description: 'Monthly Income',
        amount: parseFloat(incomeForm.amount),
        category: incomeForm.category,
        transactionDate: incomeForm.transactionDate,
        type: 'income',
        userId: user.id
      });
      setIncomeEntered(true);
      checkIncome();
    } catch (err) {
      setError('Failed to save income.');
    }
  };

  // ✅ Modified handleEdit to open modal with data
  const handleEdit = (transaction) => {
    setEditing(transaction);
    setForm({
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      transactionDate: transaction.transactionDate,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await transactionService.deleteTransaction(id);
      checkIncome();
    } catch (err) {
      setError('Failed to delete transaction.');
    }
  };

  // ✅ Added save handler for editing
  const handleSave = async () => {
    try {
      const transactionData = {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        transactionDate: form.transactionDate,
        type: editing.type || 'expense', // keep same type
      };
      await transactionService.updateTransaction(editing.id, transactionData);
      setModalOpen(false);
      checkIncome(); // reload updated data
    } catch (err) {
      setError('Failed to save transaction.');
    }
  };

  if (loading || loadingTransactions) return <Loader message="Loading your dashboard..." />;
  if (error) return <Alert type="danger" message={error} />;

  if (!incomeEntered) {
    return (
      <div className="dashboard income-center">
        <div className="income-card">
          <h3>Enter Your Monthly Income</h3>
          <p>To get started, please enter your income. This helps us provide accurate insights.</p>
          <FormInput
            label="Income Amount"
            type="number"
            name="amount"
            value={incomeForm.amount}
            onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
            placeholder="Enter amount"
            required
          />
          <FormInput
            label="Category"
            name="category"
            value={incomeForm.category}
            onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
            placeholder="e.g., Salary"
            required
          />
          <FormInput
            label="Date"
            type="date"
            name="transactionDate"
            value={incomeForm.transactionDate}
            onChange={(e) => setIncomeForm({ ...incomeForm, transactionDate: e.target.value })}
            required
          />
          <Button onClick={handleIncomeSave} variant="primary">Save Income</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard fade-in">
      <div className="welcome-title">
        <h1>Welcome back , {user?.name}!</h1>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="section-title">
            <h2>Recent Transactions</h2>
          </div>
          <TransactionList transactions={transactions.slice(0, 5)} onEdit={handleEdit} onDelete={handleDelete} />
        </div>

        <div className="col-md-6">
          <div className="section-title">
            <h2>Spending Overview</h2>
          </div>
          <Chart transactions={transactions} />
        </div>
      </div>

      {/* ✅ Added edit modal */}
      <Modal isOpen={modalOpen} title="Edit Transaction" onClose={() => setModalOpen(false)}>
        <FormInput
          label="Description"
          name="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Enter description"
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
          label="Category"
          name="category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Enter category"
          required
        />
        <FormInput
          label="Date"
          type="date"
          name="transactionDate"
          value={form.transactionDate}
          onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
          required
        />
        <Button onClick={handleSave} variant="success">Save</Button>
      </Modal>
    </div>
  );
};

export default Dashboard;
