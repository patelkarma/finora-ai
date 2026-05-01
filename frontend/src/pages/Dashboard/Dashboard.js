import React, { useEffect, useState, useContext, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  LineChart as LineChartIcon,
  Plus,
  Repeat,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Sparkline } from '../../components/ui/sparkline';
import { useCountUp } from '../../lib/use-count-up';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import transactionService from '../../services/transactionService';
import aiService from '../../services/aiService';
import subscriptionService from '../../services/subscriptionService';
import anomalyService from '../../services/anomalyService';
import forecastService from '../../services/forecastService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const Dashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState(null);
  const [incomeEntered, setIncomeEntered] = useState(false);
  const [latestInsight, setLatestInsight] = useState(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [forecast, setForecast] = useState([]);

  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    category: 'Salary',
    transactionDate: new Date().toISOString().split('T')[0],
  });
  const [savingIncome, setSavingIncome] = useState(false);
  // Once the user successfully saves their first income, we never want a
  // subsequent refresh to flip incomeEntered back to false based on a
  // stale response (cache lag, eventual consistency, etc.). This ref
  // sticks for the lifetime of the component.
  const incomeOnceSeen = useRef(false);

  // Stats window — controls the date range for the hero stat cards and
  // top-categories breakdown. Forecast / subscriptions / anomalies have
  // their own backend windows and ignore this. Default 30d matches the
  // forecast horizon so the two halves of the page tell one story.
  const [period, setPeriod] = useState('30d');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  // Quick-add modal lives on the dashboard so a user can record a
  // transaction without leaving the page they came to scan. Same shape
  // as the Transactions page modal but state-isolated.
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState(null);
  const [quickForm, setQuickForm] = useState({
    description: '',
    amount: '',
    category: '',
    transactionDate: new Date().toISOString().split('T')[0],
    type: 'expense',
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await transactionService.getAllTransactions(user.id);
      const hasIncome = data.some((t) => t.type === 'income');
      // Sticky flag: once we've ever seen an income transaction, we
      // never downgrade incomeEntered back to false based on a refresh
      // response — backend caches / eventual consistency can briefly
      // omit the just-saved transaction.
      if (hasIncome) incomeOnceSeen.current = true;
      setIncomeEntered(incomeOnceSeen.current || hasIncome);
      setTransactions(data);

      // Best-effort fetch for the most recent insight; non-blocking.
      try {
        const insights = await aiService.fetchInsights(user.id, { size: 1 });
        if (insights.length) setLatestInsight(insights[0]);
      } catch {/* ignore — insight is optional */}

      // Best-effort fetch for detected subscriptions; the card hides
      // itself when the list is empty so a failure here is invisible.
      try {
        const subs = await subscriptionService.getUserSubscriptions(user.id);
        setSubscriptions(subs);
      } catch {/* ignore — subscriptions are decorative */}

      // Best-effort fetch for spending anomalies; banner hides itself
      // when the list is empty.
      try {
        const anom = await anomalyService.getUserAnomalies(user.id);
        setAnomalies(anom);
      } catch {/* ignore */}

      // Best-effort fetch for the 30-day forecast; chart hides if empty.
      try {
        const f = await forecastService.getUserForecast(user.id, 30);
        setForecast(f);
      } catch {/* ignore */}
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

  // ───────── Stats (rolling window per `period`) ─────────
  const { totalIncome, totalExpense, net, byCategory, sparkIncome, sparkExpense, sparkNet } = useMemo(() => {
    // Days lookback: 30d → 30, 90d → 90, 1y → 365, all → +Infinity (no
    // filter). Anything else falls back to 30 to fail safely.
    const days = period === '90d' ? 90
      : period === '1y' ? 365
        : period === 'all' ? Number.POSITIVE_INFINITY
          : 30;
    const cutoff = Number.isFinite(days)
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      : null;

    let inc = 0;
    let exp = 0;
    const cats = new Map();

    // Daily buckets for sparklines. We bucket by day index from the
    // cutoff so the sparkline is naturally chronological. For the
    // 'all' case we cap to the most recent 60 days so the sparkline
    // still has shape — a year compressed into 100 pixels is just
    // noise.
    const bucketCount = !Number.isFinite(days) ? 60 : Math.min(days, 60);
    const bucketDays = !Number.isFinite(days) ? 60 : days;
    const bucketStart = new Date(Date.now() - bucketDays * 24 * 60 * 60 * 1000);
    const incomeByDay = new Array(bucketCount).fill(0);
    const expenseByDay = new Array(bucketCount).fill(0);

    for (const t of transactions) {
      const d = new Date(t.transactionDate);
      if (cutoff && d < cutoff) continue;
      const amount = parseFloat(t.amount || 0);
      if (t.type === 'income') {
        inc += amount;
      } else {
        exp += amount;
        const k = (t.category || 'Other').trim();
        cats.set(k, (cats.get(k) || 0) + amount);
      }
      // Bucket for sparkline
      const dayOffset = Math.floor((d - bucketStart) / (24 * 60 * 60 * 1000));
      const idx = Math.max(0, Math.min(bucketCount - 1,
        Math.floor((dayOffset / bucketDays) * bucketCount)));
      if (t.type === 'income') incomeByDay[idx] += amount;
      else                     expenseByDay[idx] += amount;
    }

    // Cumulative net trajectory — what the user is REALLY watching.
    const netByDay = [];
    let running = 0;
    for (let i = 0; i < bucketCount; i++) {
      running += incomeByDay[i] - expenseByDay[i];
      netByDay.push(running);
    }

    const byCat = Array.from(cats, ([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalIncome: inc, totalExpense: exp, net: inc - exp, byCategory: byCat,
      sparkIncome: incomeByDay, sparkExpense: expenseByDay, sparkNet: netByDay,
    };
  }, [transactions, period]);

  // Animated values for the hero KPI numbers. Hooks must be top-level,
  // so they sit here next to the memo that produces their targets.
  const animNet      = useCountUp(net,          { duration: 700 });
  const animIncome   = useCountUp(totalIncome,  { duration: 700 });
  const animExpense  = useCountUp(totalExpense, { duration: 700 });

  const periodLabel = useMemo(() => ({
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '1y': 'Last 12 months',
    all: 'All time',
  })[period] ?? 'Last 30 days', [period]);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
        .slice(0, 6),
    [transactions]
  );

  // ───────── Handlers ─────────
  const handleIncomeSave = async () => {
    setError(null);
    const amount = parseFloat(incomeForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid income amount greater than 0.');
      return;
    }
    if (!incomeForm.category?.trim()) {
      setError('Please enter a source / category.');
      return;
    }

    setSavingIncome(true);
    try {
      const saved = await transactionService.addTransaction({
        description: 'Monthly Income',
        amount,
        category: incomeForm.category.trim(),
        transactionDate: incomeForm.transactionDate,
        type: 'income',
        userId: user.id,
      });

      if (!saved || typeof saved !== 'object' || !saved.id) {
        throw new Error('Failed to save income. Please try again.');
      }

      // Lock the gate open via the sticky ref so a subsequent refresh
      // can't downgrade the dashboard back to the welcome screen.
      incomeOnceSeen.current = true;
      setIncomeEntered(true);
      // Seed local state with the saved transaction — the dashboard
      // renders against real data immediately, no background refresh
      // race to overwrite this with a stale empty list.
      setTransactions((prev) => [saved, ...prev]);
    } catch (err) {
      console.error('Failed to save income:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 401 || err?.response?.status === 403
          ? 'Your session expired — please sign in again.'
          : null) ||
        err?.message ||
        'Failed to save income. Please try again.';
      setError(msg);
    } finally {
      setSavingIncome(false);
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

  const openQuickAdd = () => {
    setQuickAddError(null);
    setQuickForm({
      description: '',
      amount: '',
      category: '',
      transactionDate: new Date().toISOString().split('T')[0],
      type: 'expense',
    });
    setQuickAddOpen(true);
  };

  const handleQuickSave = async () => {
    setQuickAddError(null);
    const amount = parseFloat(quickForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setQuickAddError('Amount must be greater than 0.');
      return;
    }
    if (!quickForm.category.trim()) {
      setQuickAddError('Category is required.');
      return;
    }
    setQuickAddSaving(true);
    try {
      const payload = {
        description: quickForm.description.trim() || quickForm.category.trim(),
        amount: Math.abs(amount),
        category: quickForm.category.trim(),
        transactionDate: quickForm.transactionDate,
        type: quickForm.type,
        userId: user.id,
      };
      const saved = await transactionService.addTransaction(payload);
      // Seed local state so the cards reflect the new row immediately
      // — refresh() will reconcile with backend data shortly after.
      setTransactions((prev) => [saved, ...prev]);
      setQuickAddOpen(false);
      // Re-fetch in the background so subscriptions / anomalies /
      // forecast pick up the new row once the cache eviction lands.
      refresh();
    } catch (err) {
      setQuickAddError(err?.response?.data?.message || 'Failed to save transaction.');
    } finally {
      setQuickAddSaving(false);
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
            <form
              onSubmit={(e) => { e.preventDefault(); handleIncomeSave(); }}
            >
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="income-amount">Income amount</Label>
                  <Input
                    id="income-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income-category">Source</Label>
                  <Input
                    id="income-category"
                    placeholder="Salary"
                    value={incomeForm.category}
                    onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income-date">Date</Label>
                  <Input
                    id="income-date"
                    type="date"
                    value={incomeForm.transactionDate}
                    onChange={(e) => setIncomeForm({ ...incomeForm, transactionDate: e.target.value })}
                    required
                  />
                </div>
                {error && (
                  <div className="px-3 py-2 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  disabled={savingIncome}
                >
                  {savingIncome ? 'Saving…' : 'Save and continue'}
                </Button>
              </CardFooter>
            </form>
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
      <header className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Hello, {user?.name?.split(' ')[0] || 'there'}
            <span className="text-zinc-400 dark:text-zinc-600"> 👋</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Here's your money over the {period === 'all' ? 'full history' : periodLabel.toLowerCase()}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSwitcher value={period} onChange={setPeriod} />
          <Button variant="gradient" size="lg" onClick={openQuickAdd} className="shadow-lg shadow-primary/30">
            <Plus className="h-4 w-4" /> Add transaction
          </Button>
        </div>
      </header>

      {/* Hero KPI band — NET CASHFLOW dominates as the centerpiece
          (5 cols on desktop) with an oversized number, large sparkline
          and a glowing brand surface. INCOME / EXPENSES sit in the
          right two columns at standard size with their own inline
          sparklines. The hierarchy makes "are you net positive" the
          one thing the eye lands on first. */}
      <section className="grid grid-cols-1 lg:grid-cols-7 gap-4 mb-8">
        <HeroNetCard
          value={animNet}
          target={net}
          spark={sparkNet}
          subtitle={periodLabel}
        />
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <StatCard
            label="Income"
            value={animIncome}
            tone="gain"
            icon={ArrowUpRight}
            subtitle={periodLabel}
            spark={sparkIncome}
            delay={0.05}
          />
          <StatCard
            label="Expenses"
            value={animExpense}
            tone="loss"
            icon={ArrowDownRight}
            subtitle={periodLabel}
            spark={sparkExpense}
            delay={0.1}
          />
        </div>
      </section>

      {/* Insight + breakdown row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <InsightCard
          insight={latestInsight}
          loading={generatingInsight}
          onGenerate={handleGenerateInsight}
        />
        <CategoryBreakdownCard categories={byCategory} totalExpense={totalExpense} subtitle={periodLabel} />
      </section>

      {/* Anomalies — flagged spending that's well outside normal range
          for its category. Only renders if anything was flagged. */}
      {anomalies.length > 0 && (
        <section className="mb-8">
          <AnomaliesCard anomalies={anomalies} />
        </section>
      )}

      {/* 30-day cash-flow forecast — combines salary cadence, recurring
          subscriptions, and discretionary daily spend into one trend line. */}
      {forecast.length > 0 && (
        <section className="mb-8">
          <ForecastCard points={forecast} />
        </section>
      )}

      {/* Subscriptions — only visible when at least one was detected. */}
      {subscriptions.length > 0 && (
        <section className="mb-8">
          <SubscriptionsCard subscriptions={subscriptions} />
        </section>
      )}

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

      {/* Quick-add modal */}
      <AnimatePresence>
        {quickAddOpen && (
          <QuickAddModal
            form={quickForm}
            onChange={(patch) => setQuickForm({ ...quickForm, ...patch })}
            onClose={() => !quickAddSaving && setQuickAddOpen(false)}
            onSave={handleQuickSave}
            saving={quickAddSaving}
            error={quickAddError}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

// ───────── Sub-components ─────────

/**
 * Centerpiece hero card. Replaces the equally-weighted three-card row
 * with one dominant gradient surface for the "net cashflow" headline.
 *
 * Visual ingredients:
 *  - Display-scale animated number (counts up, tabular figures)
 *  - Brand gradient + orbital blur for "looks expensive" feel
 *  - Wide sparkline strip across the bottom showing the cumulative
 *    net trajectory over the active period — turns one number into
 *    a story
 */
function HeroNetCard({ value, target, spark, subtitle }) {
  const isPositive = target >= 0;
  const formatted = `${target < 0 ? '−' : '+'}₹${Math.abs(Math.round(value)).toLocaleString('en-IN')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="lg:col-span-5 group h-full"
    >
      <Card
        variant="elevated"
        className="relative overflow-hidden h-full bg-brand-gradient border-none text-white
                   shadow-glow-lg group-hover:shadow-glow-lg transition-shadow duration-300"
      >
        {/* Orbital blurs — abstract "expensive software" lighting. */}
        <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-44 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-white/75 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Net cashflow
            </CardDescription>
            <span className={cn(
              'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium',
              isPositive ? 'bg-white/20 text-white' : 'bg-white/15 text-white/80'
            )}>
              {isPositive ? 'positive' : 'deficit'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-4 relative">
          <div className="num-display text-display-sm sm:text-display lg:text-display font-semibold leading-none truncate">
            {formatted}
          </div>
          <p className="text-xs text-white/65 mt-3">
            {subtitle}
          </p>
        </CardContent>

        {/* Bottom-aligned wide sparkline. White stroke at low opacity
            keeps the chart legible without competing with the number. */}
        {spark && spark.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none opacity-90">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="hero-net-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%"  stopColor="rgba(255,255,255,0.35)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              {(() => {
                const min = Math.min(...spark);
                const max = Math.max(...spark);
                const range = max - min || 1;
                const stepX = spark.length > 1 ? 100 / (spark.length - 1) : 0;
                const pts = spark.map((v, i) => ({
                  x: i * stepX,
                  y: 30 - ((v - min) / range) * 26 - 2,
                }));
                const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                const fill = `${line} L100,30 L0,30 Z`;
                return (
                  <>
                    <path d={fill} fill="url(#hero-net-fill)" />
                    <path d={line} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </svg>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

/**
 * Side stat card — INCOME / EXPENSES siblings. Smaller than the hero
 * but pull their visual weight via tone-coloured icons + an inline
 * sparkline that lives on the right side, not the bottom.
 */
function StatCard({ label, value, tone, icon: Icon, subtitle = 'This month', spark = [], delay = 0 }) {
  const animated = Math.round(typeof value === 'number' ? value : 0);
  const formatted = `₹${Math.abs(animated).toLocaleString('en-IN')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="group h-full"
    >
      <Card className="relative overflow-hidden h-full card-lift">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardDescription className="text-[10px] uppercase tracking-wider mb-1.5">
                {label}
              </CardDescription>
              <div
                className={cn(
                  'num-display text-2xl xl:text-3xl font-semibold tracking-tight truncate',
                  tone === 'gain' && 'text-[hsl(var(--gain))]',
                  tone === 'loss' && 'text-[hsl(var(--loss))]'
                )}
              >
                {formatted}
              </div>
            </div>
            <div
              className={cn(
                'h-9 w-9 rounded-lg grid place-items-center flex-shrink-0',
                tone === 'gain'
                  ? 'bg-[hsl(var(--gain))]/12 text-[hsl(var(--gain))]'
                  : tone === 'loss'
                    ? 'bg-[hsl(var(--loss))]/12 text-[hsl(var(--loss))]'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 mt-auto">
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {spark.length > 1 && (
              <Sparkline
                values={spark}
                tone={tone}
                width={88}
                height={28}
                strokeWidth={1.5}
                className="opacity-90"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function InsightCard({ insight, loading, onGenerate }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="lg:col-span-2 group"
    >
      <Card className="bg-brand-gradient text-white border-none overflow-hidden relative shadow-xl shadow-primary/25 group-hover:shadow-2xl group-hover:shadow-primary/40 transition-shadow duration-300">
        {/* Decorative blurred orbs */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <CardHeader>
          <div className="flex items-center gap-2 text-white/80 mb-1">
            <div className="h-7 w-7 rounded-md bg-white/15 grid place-items-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <CardDescription className="text-white/80 text-xs uppercase tracking-wider">
              AI insight
            </CardDescription>
          </div>
          <CardTitle className="text-white text-base md:text-lg leading-relaxed font-normal mt-2 max-w-prose">
            {insight ? insight.message : 'No insight yet — generate one based on your transactions and budgets.'}
          </CardTitle>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button variant="secondary" size="sm" onClick={onGenerate} disabled={loading}>
            <Sparkles className="h-4 w-4" />
            {loading ? 'Generating…' : insight ? 'Regenerate' : 'Generate insight'}
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
            <Link to="/ai-insights">View all →</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function CategoryBreakdownCard({ categories, totalExpense, subtitle = 'This month' }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-zinc-400" /> Top spending categories
        </CardDescription>
        <CardTitle className="text-lg">{subtitle}</CardTitle>
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

function ForecastCard({ points }) {
  const last = points[points.length - 1];
  const projectedNet = last ? parseFloat(last.cumulative) : 0;
  const isNegative = projectedNet < 0;

  // chart.js dataset + options. Theme-friendly: line color depends on
  // whether the projected end-of-window is positive (gain) or negative
  // (loss). Filled area below the line for visual weight.
  const labels = points.map((p) => {
    const d = new Date(p.date);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
  const data = points.map((p) => parseFloat(p.cumulative));

  // Resolve CSS-var-driven colors at render time so dark/light themes
  // both look right. Fall back to fixed hex if the var isn't readable.
  const lineColor = isNegative ? 'hsl(0, 70%, 60%)' : 'hsl(160, 70%, 45%)';
  const fillColor = isNegative ? 'hsla(0, 70%, 60%, 0.10)' : 'hsla(160, 70%, 45%, 0.12)';

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Projected balance',
        data,
        borderColor: lineColor,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? '',
          label: (ctx) => {
            const p = points[ctx.dataIndex];
            const lines = [`Cumulative: ₹${parseFloat(p.cumulative).toLocaleString('en-IN')}`];
            if (parseFloat(p.income) > 0) lines.push(`Income: +₹${parseFloat(p.income).toLocaleString('en-IN')}`);
            if (parseFloat(p.subscription) > 0) lines.push(`Subscriptions: -₹${parseFloat(p.subscription).toLocaleString('en-IN')}`);
            if (parseFloat(p.discretionary) > 0) lines.push(`Discretionary: -₹${parseFloat(p.discretionary).toLocaleString('en-IN')}`);
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0, autoSkipPadding: 16, color: 'rgba(120,120,135,0.7)' },
      },
      y: {
        grid: { color: 'rgba(120,120,135,0.12)' },
        ticks: {
          color: 'rgba(120,120,135,0.7)',
          callback: (v) => '₹' + Number(v).toLocaleString('en-IN'),
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardDescription className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-zinc-400" /> 30-day forecast
          </CardDescription>
          <CardTitle className="text-lg">Projected cash flow</CardTitle>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
            End of window
          </p>
          <MoneyValue
            value={projectedNet}
            colorize
            showSign="always"
            className="text-lg font-semibold"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <Line data={chartData} options={options} />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
          Combines your stated salary on its usual day, recurring subscription charges, and your average daily discretionary spend.
        </p>
      </CardContent>
    </Card>
  );
}

function AnomaliesCard({ anomalies }) {
  const severeCount = anomalies.filter((a) => a.severity === 'SEVERE').length;
  const top = anomalies.slice(0, 5);
  const accent = severeCount > 0 ? 'destructive' : 'amber';

  return (
    <Card
      className={cn(
        'overflow-hidden border',
        accent === 'destructive'
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-amber-500/30 bg-amber-500/5'
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'h-9 w-9 rounded-lg grid place-items-center flex-shrink-0',
              accent === 'destructive'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <CardDescription>Unusual spending</CardDescription>
            <CardTitle className="text-lg">
              {anomalies.length} flagged
              {severeCount > 0 && (
                <span className="text-destructive ml-2 text-sm font-normal">
                  ({severeCount} severe)
                </span>
              )}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {top.map((a, i) => (
            <motion.li
              key={a.transactionId ?? i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {a.description}
                  </p>
                  {a.severity === 'SEVERE' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-destructive/15 text-destructive">
                      severe
                    </span>
                  )}
                </div>
                <p
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                  title={`${a.zScore}σ above category average`}
                >
                  {a.category} · {formatShortDate(a.transactionDate)} · usually around{' '}
                  <MoneyValue value={a.categoryMean} className="inline" />
                </p>
              </div>
              <MoneyValue
                value={a.amount}
                className={cn(
                  'text-sm font-semibold tabular-nums whitespace-nowrap',
                  a.severity === 'SEVERE'
                    ? 'text-destructive'
                    : 'text-amber-600 dark:text-amber-400'
                )}
              />
            </motion.li>
          ))}
        </ul>
        {anomalies.length > top.length && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center">
            +{anomalies.length - top.length} more
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionsCard({ subscriptions }) {
  // Estimated monthly cost across all detected subscriptions, normalized
  // by period (weekly × 4.33, biweekly × 2.17, yearly ÷ 12).
  const monthlyTotal = subscriptions.reduce((sum, s) => {
    const amount = parseFloat(s.amount) || 0;
    const factor = {
      WEEKLY: 4.33,
      BIWEEKLY: 2.17,
      MONTHLY: 1,
      YEARLY: 1 / 12,
    }[s.period] ?? 1;
    return sum + amount * factor;
  }, 0);

  const top = subscriptions.slice(0, 6);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardDescription className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-zinc-400" /> Detected subscriptions
          </CardDescription>
          <CardTitle className="text-lg">
            {subscriptions.length} recurring
          </CardTitle>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
            Est. monthly
          </p>
          <MoneyValue value={monthlyTotal} className="text-lg font-semibold" />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
          {top.map((s, i) => (
            <motion.li
              key={`${s.name}-${s.amount}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                  {s.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {periodLabel(s.period)} · {s.occurrences}× ·{' '}
                  <span title="next expected">
                    next {formatShortDate(s.nextExpected)}
                  </span>
                </p>
              </div>
              <MoneyValue
                value={s.amount}
                className="text-sm text-zinc-700 dark:text-zinc-300 tabular-nums whitespace-nowrap"
              />
            </motion.li>
          ))}
        </ul>
        {subscriptions.length > top.length && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center">
            +{subscriptions.length - top.length} more
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function periodLabel(period) {
  return {
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Bi-weekly',
    MONTHLY: 'Monthly',
    YEARLY: 'Yearly',
  }[period] ?? period;
}

function formatShortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function QuickAddModal({ form, onChange, onClose, onSave, saving, error }) {
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
              <CardTitle>Quick add</CardTitle>
              <CardDescription>Record a transaction without leaving the dashboard.</CardDescription>
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
                        layoutId="dash-quick-type-pill"
                        className="absolute inset-0 -z-10 rounded bg-white dark:bg-zinc-800 shadow-sm"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    {label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-amount">Amount</Label>
                <Input
                  id="qa-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => onChange({ amount: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-cat">Category</Label>
                <Input
                  id="qa-cat"
                  placeholder="Groceries, Rent, Salary…"
                  value={form.category}
                  onChange={(e) => onChange({ category: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-desc">
                  Description <span className="text-zinc-500 font-normal">(optional)</span>
                </Label>
                <Input
                  id="qa-desc"
                  placeholder="Weekly shop"
                  value={form.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-date">Date</Label>
                <Input
                  id="qa-date"
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
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={saving}>
                {saving ? 'Saving…' : 'Add'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function PeriodSwitcher({ value, onChange }) {
  const options = [
    { v: '30d', label: '30D' },
    { v: '90d', label: '90D' },
    { v: '1y', label: '1Y' },
    { v: 'all', label: 'All' },
  ];
  // The switcher sits on the bare page background, so it needs its own
  // outline to stay visible — `bg-zinc-100 dark:bg-zinc-900` blended
  // into the dark page bg before, and the selected pill barely lifted
  // off the track. Use design-token surfaces (muted track, card pill)
  // plus an explicit border so the control reads as a control in both
  // themes.
  return (
    <div className="inline-flex gap-1 p-1 rounded-md bg-muted/60 border border-border">
      {options.map(({ v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'px-3 py-1.5 rounded text-xs font-medium transition-colors relative',
            value === v
              ? 'text-zinc-900 dark:text-white'
              : 'text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
          )}
          aria-pressed={value === v}
        >
          {value === v && (
            <motion.span
              layoutId="dashboard-period-pill"
              className="absolute inset-0 -z-10 rounded bg-white dark:bg-zinc-700 shadow-sm dark:shadow-black/40"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          {label}
        </button>
      ))}
    </div>
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
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Use Card here instead of a hand-rolled bg-white/dark:bg-zinc-950
            div: Card already uses bg-card / text-card-foreground via CSS
            variables, which we've already proved render correctly elsewhere
            on the dashboard. Avoids any dark:variant compile inconsistency. */}
        <Card>
          <CardHeader>
            <CardTitle>Edit transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={onDelete}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button variant="gradient" onClick={onSave}>Save</Button>
            </div>
          </CardFooter>
        </Card>
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
