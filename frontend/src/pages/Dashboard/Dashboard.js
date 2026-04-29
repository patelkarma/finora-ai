import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import transactionService from '../../services/transactionService';
import aiService from '../../services/aiService';
import { AppLayout } from '../../components/app-layout';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { MoneyValue } from '../../components/ui/money-value';
import { cn } from '../../lib/utils';

const Dashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState(null);
  const [incomeEntered, setIncomeEntered] = useState(false);
  const [latestInsight, setLatestInsight] = useState(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);

  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    category: 'Salary',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await transactionService.getAllTransactions(user.id);
      setIncomeEntered(data.some((t) => t.type === 'income'));
      setTransactions(data);

      // Best-effort fetch for the most recent insight; non-blocking.
      try {
        const insights = await aiService.fetchInsights(user.id, { size: 1 });
        if (insights.length) setLatestInsight(insights[0]);
      } catch {/* ignore — insight is optional */}
    } catch (err) {
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoadingTransactions(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (user) refresh();
  }, [user, loading, navigate, refresh]);

  // ───────── Stats (this month) ─────────
  const { totalIncome, totalExpense, net, byCategory } = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    let inc = 0;
    let exp = 0;
    const cats = new Map();

    for (const t of transactions) {
      const d = new Date(t.transactionDate);
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) continue;
      const amount = parseFloat(t.amount || 0);
      if (t.type === 'income') {
        inc += amount;
      } else {
        exp += amount;
        const k = (t.category || 'Other').trim();
        cats.set(k, (cats.get(k) || 0) + amount);
      }
    }

    const byCat = Array.from(cats, ([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return { totalIncome: inc, totalExpense: exp, net: inc - exp, byCategory: byCat };
  }, [transactions]);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
        .slice(0, 6),
    [transactions]
  );

  // ───────── Handlers ─────────
  const handleIncomeSave = async () => {
    try {
      await transactionService.addTransaction({
        description: 'Monthly Income',
        amount: parseFloat(incomeForm.amount),
        category: incomeForm.category,
        transactionDate: incomeForm.transactionDate,
        type: 'income',
        userId: user.id,
      });
      refresh();
    } catch {
      setError('Failed to save income.');
    }
  };

  const handleEdit = (t) => {
    setEditing(t);
    setForm({
      description: t.description,
      amount: t.amount,
      category: t.category,
      transactionDate: t.transactionDate,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await transactionService.deleteTransaction(id);
      refresh();
    } catch {
      setError('Failed to delete transaction.');
    }
  };

  const handleSave = async () => {
    try {
      await transactionService.updateTransaction(editing.id, {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        transactionDate: form.transactionDate,
        type: editing.type || 'expense',
      });
      setModalOpen(false);
      refresh();
    } catch {
      setError('Failed to save transaction.');
    }
  };

  const handleGenerateInsight = async () => {
    setGeneratingInsight(true);
    try {
      const insight = await aiService.generateInsight(user.id);
      setLatestInsight(insight);
    } catch {
      setError('Failed to generate insight.');
    } finally {
      setGeneratingInsight(false);
    }
  };

  // ───────── Render ─────────
  if (loading || loadingTransactions) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  if (!incomeEntered) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Finora, {user?.name?.split(' ')[0] || 'there'} 👋</CardTitle>
              <CardDescription>
                Enter your monthly income to start. We'll use this to track spending and generate insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="income-amount">Income amount</Label>
                <Input
                  id="income-amount"
                  type="number"
                  placeholder="₹0.00"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="income-category">Source</Label>
                <Input
                  id="income-category"
                  placeholder="Salary"
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="income-date">Date</Label>
                <Input
                  id="income-date"
                  type="date"
                  value={incomeForm.transactionDate}
                  onChange={(e) => setIncomeForm({ ...incomeForm, transactionDate: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="gradient" size="lg" className="w-full" onClick={handleIncomeSave}>
                Save and continue
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {error && (
        <div className="mb-4 px-4 py-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Greeting */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Hello, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Here's your money this month.
          </p>
        </div>
        <Button asChild variant="gradient">
          <Link to="/transactions">
            <Plus className="h-4 w-4" /> Add transaction
          </Link>
        </Button>
      </header>

      {/* Hero stat row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Net cashflow"
          value={net}
          showSign
          colorize
          accent="brand"
          icon={Wallet}
          delay={0}
        />
        <StatCard
          label="Income"
          value={totalIncome}
          tone="gain"
          icon={ArrowUpRight}
          delay={0.05}
        />
        <StatCard
          label="Expenses"
          value={totalExpense}
          tone="loss"
          icon={ArrowDownRight}
          delay={0.1}
        />
      </section>

      {/* Insight + breakdown row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <InsightCard
          insight={latestInsight}
          loading={generatingInsight}
          onGenerate={handleGenerateInsight}
        />
        <CategoryBreakdownCard categories={byCategory} totalExpense={totalExpense} />
      </section>

      {/* Recent transactions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent transactions</h2>
          <Link
            to="/transactions"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
              No transactions yet. Add your first one to see it here.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {recent.map((t, i) => (
                <motion.li
                  key={t.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  onClick={() => handleEdit(t)}
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                        {t.description || t.category}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t.category} · {formatRelativeDate(t.transactionDate)}
                      </p>
                    </div>
                  </div>
                  <MoneyValue
                    value={t.type === 'income' ? t.amount : -t.amount}
                    colorize
                    showSign="always"
                    className="text-sm font-medium"
                  />
                </motion.li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <EditModal
            form={form}
            onChange={(patch) => setForm({ ...form, ...patch })}
            onClose={() => setModalOpen(false)}
            onSave={handleSave}
            onDelete={() => {
              handleDelete(editing.id);
              setModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

// ───────── Sub-components ─────────

function StatCard({ label, value, tone, accent, showSign, colorize, icon: Icon, delay = 0 }) {
  const isBrand = accent === 'brand';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={cn(isBrand && 'bg-brand-gradient text-white border-none')}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className={cn(isBrand && 'text-white/80')}>{label}</CardDescription>
            <Icon className={cn('h-4 w-4', isBrand ? 'text-white/80' : 'text-zinc-400')} />
          </div>
          <CardTitle className={cn('text-3xl', isBrand && 'text-white')}>
            <MoneyValue
              value={value}
              showSign={showSign ? 'always' : 'never'}
              colorize={colorize && !isBrand}
              className={cn(
                tone === 'gain' && !isBrand && 'text-[hsl(var(--gain))]',
                tone === 'loss' && !isBrand && 'text-[hsl(var(--loss))]'
              )}
            />
          </CardTitle>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

function InsightCard({ insight, loading, onGenerate }) {
  return (
    <Card className="lg:col-span-2 bg-brand-gradient text-white border-none overflow-hidden relative">
      <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <CardHeader>
        <div className="flex items-center gap-2 text-white/80">
          <Sparkles className="h-4 w-4" />
          <CardDescription className="text-white/80">AI insight</CardDescription>
        </div>
        <CardTitle className="text-white text-lg leading-relaxed font-normal mt-1">
          {insight ? insight.message : 'No insight yet — generate one based on your transactions and budgets.'}
        </CardTitle>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button variant="secondary" size="sm" onClick={onGenerate} disabled={loading}>
          <Sparkles className="h-4 w-4" />
          {loading ? 'Generating…' : insight ? 'Regenerate' : 'Generate insight'}
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
          <Link to="/ai-insights">View all insights →</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function CategoryBreakdownCard({ categories, totalExpense }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-zinc-400" /> Top spending categories
        </CardDescription>
        <CardTitle className="text-lg">This month</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No expenses recorded yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {categories.map((c, i) => {
              const pct = totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0;
              return (
                <motion.li
                  key={c.category}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300">{c.category}</span>
                    <MoneyValue value={c.amount} className="text-zinc-500 dark:text-zinc-400 text-xs" />
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-brand-gradient"
                    />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EditModal({ form, onChange, onClose, onSave, onDelete }) {
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
        className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Edit transaction</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Input
              id="edit-desc"
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                value={form.amount}
                onChange={(e) => onChange({ amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat">Category</Label>
              <Input
                id="edit-cat"
                value={form.category}
                onChange={(e) => onChange({ category: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={form.transactionDate}
              onChange={(e) => onChange({ transactionDate: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={onDelete}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="gradient" onClick={onSave}>Save</Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-44 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
        <div className="h-44 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
      </div>
      <div className="h-80 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
    </div>
  );
}

function formatRelativeDate(iso) {
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
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default Dashboard;
