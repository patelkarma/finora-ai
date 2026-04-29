import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import transactionService from '../../services/transactionService';
import { AppLayout } from '../../components/app-layout';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { MoneyValue } from '../../components/ui/money-value';
import { cn } from '../../lib/utils';

const Transactions = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | income | expense

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    transactionDate: new Date().toISOString().split('T')[0],
    type: 'expense',
  });

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await transactionService.getAllTransactions(user.id);
      setTransactions(data);
    } catch {
      setError('Failed to load transactions.');
    } finally {
      setLoadingTransactions(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (user) fetchTransactions();
  }, [user, loading, navigate, fetchTransactions]);

  // Filter + search + sort once
  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filter !== 'all') list = list.filter((t) => t.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
    return list;
  }, [transactions, search, filter]);

  // Group by date label (Today / Yesterday / "26 Apr")
  const grouped = useMemo(() => {
    const groups = new Map();
    for (const t of filtered) {
      const label = relativeDate(t.transactionDate);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(t);
    }
    return Array.from(groups, ([label, items]) => ({ label, items }));
  }, [filtered]);

  const handleAdd = () => {
    setEditing(null);
    setForm({
      description: '',
      amount: '',
      category: '',
      transactionDate: new Date().toISOString().split('T')[0],
      type: 'expense',
    });
    setModalOpen(true);
  };

  const handleEdit = (t) => {
    setEditing(t);
    setForm({
      description: t.description || '',
      amount: Math.abs(t.amount),
      category: t.category || '',
      transactionDate: t.transactionDate,
      type: t.type || 'expense',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await transactionService.deleteTransaction(id);
      fetchTransactions();
    } catch {
      setError('Failed to delete transaction.');
    }
  };

  const handleSave = async () => {
    setError(null);
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!form.category.trim()) {
      setError('Category is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        description: form.description.trim() || form.category.trim(),
        amount: Math.abs(amount),
        category: form.category.trim(),
        transactionDate: form.transactionDate,
        type: form.type,
      };
      if (editing) {
        await transactionService.updateTransaction(editing.id, payload);
      } else {
        await transactionService.addTransaction({ ...payload, userId: user.id });
      }
      setModalOpen(false);
      fetchTransactions();
    } catch (err) {
      console.error('Save transaction failed:', err);
      setError(err?.response?.data?.message || 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingTransactions) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="h-10 w-52 rounded-md bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          <div className="h-12 rounded-md bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          <div className="h-96 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            {filter !== 'all' && ` · ${filter}`}
            {search && ` · matching "${search}"`}
          </p>
        </div>
        <Button variant="gradient" size="lg" onClick={handleAdd} className="shadow-lg shadow-primary/30">
          <Plus className="h-4 w-4" /> Add transaction
        </Button>
      </header>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search description or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-md bg-zinc-100 dark:bg-zinc-900">
            {[
              { v: 'all', label: 'All' },
              { v: 'income', label: 'Income' },
              { v: 'expense', label: 'Expense' },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors relative',
                  filter === v
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
                )}
              >
                {filter === v && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 -z-10 rounded bg-white dark:bg-zinc-800 shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List grouped by date */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 grid place-items-center mb-3">
              <Search className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium">No transactions found</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {transactions.length === 0
                ? 'Add your first transaction to see it here.'
                : 'Try adjusting your filters or search.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.label}>
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-2 px-1">
                {g.label}
              </h2>
              <Card>
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {g.items.map((t, i) => (
                    <motion.li
                      key={t.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.2 }}
                      className="group flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                      onClick={() => handleEdit(t)}
                    >
                      <div
                        className={cn(
                          'h-9 w-9 rounded-full grid place-items-center flex-shrink-0',
                          t.type === 'income'
                            ? 'bg-[hsl(var(--gain))]/15 text-[hsl(var(--gain))]'
                            : 'bg-[hsl(var(--loss))]/15 text-[hsl(var(--loss))]'
                        )}
                      >
                        {t.type === 'income' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                          {t.description || t.category}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.category}</p>
                      </div>
                      <MoneyValue
                        value={t.type === 'income' ? t.amount : -t.amount}
                        colorize
                        showSign="always"
                        className="text-sm font-medium"
                      />
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                          className="h-8 w-8 grid place-items-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(t.id, e)}
                          className="h-8 w-8 grid place-items-center rounded hover:bg-destructive/10 text-zinc-500 hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <TransactionModal
            editing={editing}
            form={form}
            onChange={(patch) => setForm({ ...form, ...patch })}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
            saving={saving}
            error={error}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

function TransactionModal({ editing, form, onChange, onClose, onSave, saving, error }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <Card>
          <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
            <CardHeader>
              <CardTitle>{editing ? 'Edit transaction' : 'Add transaction'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-1 p-1 rounded-md bg-zinc-100 dark:bg-zinc-900">
                {[
                  { v: 'expense', label: 'Expense', tone: 'loss' },
                  { v: 'income', label: 'Income', tone: 'gain' },
                ].map(({ v, label, tone }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onChange({ type: v })}
                    className={cn(
                      'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors relative',
                      form.type === v
                        ? `text-[hsl(var(--${tone}))]`
                        : 'text-zinc-500 dark:text-zinc-400'
                    )}
                  >
                    {form.type === v && (
                      <motion.span
                        layoutId="modal-type-pill"
                        className="absolute inset-0 -z-10 rounded bg-white dark:bg-zinc-800 shadow-sm"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-amount">Amount</Label>
                <Input
                  id="t-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => onChange({ amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-cat">Category</Label>
                <Input
                  id="t-cat"
                  placeholder="Groceries, Rent, Salary…"
                  value={form.category}
                  onChange={(e) => onChange({ category: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-desc">
                  Description <span className="text-zinc-500 font-normal">(optional)</span>
                </Label>
                <Input
                  id="t-desc"
                  placeholder="Weekly shop"
                  value={form.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-date">Date</Label>
                <Input
                  id="t-date"
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => onChange({ transactionDate: e.target.value })}
                  required
                />
              </div>
              {error && (
                <div className="px-3 py-2 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Add'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function relativeDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);

  const same = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (same(d, today)) return 'Today';
  if (same(d, yest)) return 'Yesterday';

  const isThisYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: isThisYear ? undefined : 'numeric',
  });
}

export default Transactions;
