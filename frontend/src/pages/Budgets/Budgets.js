import React, { useEffect, useState, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Target, AlertTriangle } from 'lucide-react';
import budgetService from '../../services/budgetService';
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

const PERIODS = ['monthly', 'weekly', 'yearly'];

const Budgets = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [budgets, setBudgets] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: '', amount: '', period: 'monthly' });

  const fetchBudgets = useCallback(async () => {
    if (!user) return;
    try {
      const data = await budgetService.getAllBudgets(user.id);
      setBudgets(data);
    } catch {
      setError('Failed to load budgets.');
    } finally {
      setLoadingBudgets(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (user) fetchBudgets();
  }, [user, loading, navigate, fetchBudgets]);

  const handleAdd = () => {
    setEditing(null);
    setForm({ category: '', amount: '', period: 'monthly' });
    setError(null);
    setModalOpen(true);
  };

  const handleEdit = (b) => {
    setEditing(b);
    setForm({ category: b.category, amount: b.amount, period: b.period });
    setError(null);
    setModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this budget?')) return;
    try {
      await budgetService.deleteBudget(id);
      fetchBudgets();
    } catch {
      setError('Failed to delete budget.');
    }
  };

  const handleSave = async () => {
    setError(null);
    const amount = parseFloat(form.amount);
    if (!form.category.trim()) return setError('Category is required.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Amount must be greater than 0.');

    setSaving(true);
    try {
      const payload = { category: form.category.trim(), amount, period: form.period };
      if (editing) {
        await budgetService.updateBudget(editing.id, payload);
      } else {
        await budgetService.addBudget({ ...payload, userId: user.id });
      }
      setModalOpen(false);
      fetchBudgets();
    } catch (err) {
      console.error('Save budget failed:', err);
      setError(err?.response?.data?.message || 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingBudgets) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="h-10 w-44 rounded-md bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {budgets.length} active {budgets.length === 1 ? 'budget' : 'budgets'}
          </p>
        </div>
        <Button variant="gradient" size="lg" onClick={handleAdd} className="shadow-lg shadow-primary/30">
          <Plus className="h-4 w-4" /> New budget
        </Button>
      </header>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 grid place-items-center mb-3">
              <Target className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium">No budgets yet</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Set a category limit to start tracking spending against it.
            </p>
            <Button variant="gradient" className="mt-4" onClick={handleAdd}>
              <Plus className="h-4 w-4" /> Create your first budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b, i) => (
            <BudgetCard
              key={b.id}
              budget={b}
              index={i}
              onEdit={() => handleEdit(b)}
              onDelete={(e) => handleDelete(b.id, e)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <BudgetModal
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

function BudgetCard({ budget, index, onEdit, onDelete }) {
  const spent = parseFloat(budget.spent || 0);
  const limit = parseFloat(budget.amount || 0);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const overage = spent - limit;
  const isOver = overage > 0;
  const isClose = !isOver && pct >= 80;

  const tone = isOver ? 'over' : isClose ? 'warn' : 'ok';
  const toneClasses = {
    ok:   'bg-[hsl(var(--gain))]',
    warn: 'bg-amber-400',
    over: 'bg-[hsl(var(--loss))]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -3 }}
      className="group h-full"
    >
      <Card className="h-full relative overflow-hidden transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-black/5 dark:group-hover:shadow-black/30 group-hover:border-zinc-300 dark:group-hover:border-zinc-700">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                {budget.period || 'monthly'}
              </p>
              <CardTitle className="text-lg mt-1">{budget.category}</CardTitle>
            </div>
            <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="h-8 w-8 grid place-items-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500"
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="h-8 w-8 grid place-items-center rounded hover:bg-destructive/10 text-zinc-500 hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <MoneyValue value={spent} className="text-2xl font-semibold" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              of <MoneyValue value={limit} />
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.1 + index * 0.04, duration: 0.7, ease: 'easeOut' }}
              className={cn('h-full', toneClasses[tone])}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">{Math.round(pct)}% used</span>
            {isOver ? (
              <span className="flex items-center gap-1 text-[hsl(var(--loss))] font-medium">
                <AlertTriangle className="h-3 w-3" />
                Over by <MoneyValue value={overage} />
              </span>
            ) : (
              <span className="text-zinc-500 dark:text-zinc-400">
                <MoneyValue value={limit - spent} /> left
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BudgetModal({ editing, form, onChange, onClose, onSave, saving, error }) {
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
              <CardTitle>{editing ? 'Edit budget' : 'New budget'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="b-cat">Category</Label>
                <Input
                  id="b-cat"
                  placeholder="Groceries, Dining, Transport…"
                  value={form.category}
                  onChange={(e) => onChange({ category: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-amount">Limit amount</Label>
                <Input
                  id="b-amount"
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
                <Label>Period</Label>
                <div className="flex gap-1 p-1 rounded-md bg-zinc-100 dark:bg-zinc-900">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onChange({ period: p })}
                      className={cn(
                        'flex-1 px-3 py-1.5 rounded text-sm font-medium capitalize transition-colors relative',
                        form.period === p
                          ? 'text-zinc-900 dark:text-zinc-50'
                          : 'text-zinc-500 dark:text-zinc-400'
                      )}
                    >
                      {form.period === p && (
                        <motion.span
                          layoutId="period-pill"
                          className="absolute inset-0 -z-10 rounded bg-white dark:bg-zinc-800 shadow-sm"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      {p}
                    </button>
                  ))}
                </div>
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
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default Budgets;
