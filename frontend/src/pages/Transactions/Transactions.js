import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import transactionService from '../../services/transactionService';
import TransactionList from '../../components/TransactionList/TransactionList';
import Modal from '../../components/Modal/Modal';
import FormInput from '../../components/formInput/formInput';
import Button from '../../components/Button/Button';
import Loader from '../../components/Loader/Loader';
import Alert from '../../components/Alert/Alert';
import './Transactions.css';

const Transactions = () => {
  const { user, loading } = useContext(AuthContext); // Add loading
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    transactionDate: new Date().toISOString().split('T')[0],
    type: 'expense', // ✅ default
  });
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login'); // Redirect if not logged in
      return;
    }
    if (user) {
      fetchTransactions();
    }
  }, [user, loading, navigate]);

  const fetchTransactions = async () => {
    try {
      const data = await transactionService.getAllTransactions(user.id);
      setTransactions(data);
    } catch (err) {
      setError('Failed to load transactions.');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleAdd = () => {
    setEditing(null);
    setForm({
      description: '',
      amount: '',
      category: '',
      transactionDate: new Date().toISOString().split('T')[0],
      type: 'expense', // ✅ ADD THIS
    });
    setModalOpen(true);
  };


  const handleEdit = (transaction) => {
    setEditing(transaction);
    setForm({
      description: transaction.description,
      amount: Math.abs(transaction.amount),
      category: transaction.category,
      transactionDate: transaction.transactionDate,
      type: transaction.type || 'expense', // ✅ ADD THIS
    });
    setModalOpen(true);
  };


  const handleDelete = async (id) => {
    try {
      await transactionService.deleteTransaction(id);
      fetchTransactions();
    } catch (err) {
      setError('Failed to delete transaction.');
    }
  };

  const handleSave = async () => {
    try {
      const transactionData = {
        description: form.description,
        amount: Math.abs(parseFloat(form.amount)), // ✅ always positive
        category: form.category,
        transactionDate: form.transactionDate,
        type: form.type, // ✅ dynamic
      };

      if (editing) {
        await transactionService.updateTransaction(editing.id, transactionData);
      } else {
        await transactionService.addTransaction({ ...transactionData, userId: user.id });
      }

      setModalOpen(false);
      fetchTransactions();
    } catch (err) {
      setError('Failed to save transaction.');
    }
  };


  if (loading || loadingTransactions) return <Loader message="Loading transactions..." />;
  if (error) return <Alert type="danger" message={error} />;

  return (
    <div className="transactions">
      <h1>Transactions</h1>
      <Button onClick={handleAdd} className="mb-3">Add Transaction</Button>
      <TransactionList transactions={transactions} onEdit={handleEdit} onDelete={handleDelete} />
      <Modal isOpen={modalOpen} title={editing ? 'Edit Transaction' : 'Add Transaction'} onClose={() => setModalOpen(false)}>
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

        <div className="mb-3">
          <label className="form-label">Transaction Type</label>
          <select
            className="form-select"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="expense">Debit (−)</option>
            <option value="income">Credit (+)</option>
          </select>
        </div>

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

export default Transactions;