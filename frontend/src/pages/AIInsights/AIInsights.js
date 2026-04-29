import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import aiService from '../../services/aiService';
import { AppLayout } from '../../components/app-layout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const POLL_MS = 60 * 1000;

const AIInsights = () => {
  const { user } = useContext(AuthContext);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const prevIds = useRef(new Set());

  const fetchInsights = useCallback(async (showLoader = true) => {
    if (!user) return;
    if (showLoader) setLoading(true);
    try {
      const data = await aiService.fetchInsights(user.id);
      const list = Array.isArray(data) ? data : [data].filter(Boolean);
      setInsights(list);

      const newOnes = list.filter((i) => !prevIds.current.has(i.id));
      newOnes.forEach((i) => notifyUser(i));
      prevIds.current = new Set(list.map((d) => d.id));
    } catch (e) {
      console.error('Error fetching insights:', e);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(() => fetchInsights(false), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  const handleGenerate = async () => {
    if (!user) return;
    setError(null);
    setRefreshing(true);
    try {
      await aiService.generateInsight(user.id);
      await fetchInsights(false);
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          'Failed to generate insight. Try again in a moment.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const notifyUser = (insight) => {
    if (!('Notification' in window)) return;
    const text = insight?.message ?? insight?.content ?? '';
    const body = text.slice ? text.slice(0, 200) : String(text).substring(0, 200);
    if (Notification.permission === 'granted') {
      new Notification('Finora — new insight', { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') new Notification('Finora — new insight', { body });
      });
    }
  };

  return (
    <AppLayout>
      <header className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI insights
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Your money, explained
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Generated against your transactions and budgets. Polls every minute for new ones.
          </p>
        </div>
        <Button
          variant="gradient"
          size="lg"
          onClick={handleGenerate}
          disabled={refreshing}
          className="shadow-lg shadow-primary/30"
        >
          <Sparkles className="h-4 w-4" />
          {refreshing ? 'Generating…' : 'Generate insight'}
        </Button>
      </header>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-brand-gradient grid place-items-center mb-3 shadow-md shadow-primary/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium">
              No insights yet
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Generate your first insight to see what your spending patterns say about your finances.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {insights.map((i, idx) => (
              <motion.li
                key={i.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
              >
                <InsightItem insight={i} highlighted={idx === 0} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </AppLayout>
  );
};

function InsightItem({ insight, highlighted }) {
  const ts = insight.createdAt;
  const message = insight.message || insight.content || '';

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card
        className={
          highlighted
            ? 'relative overflow-hidden bg-brand-gradient text-white border-none shadow-xl shadow-primary/25'
            : 'transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30'
        }
      >
        {highlighted && (
          <>
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          </>
        )}
        <CardContent className="p-6">
          <div className={
            highlighted
              ? 'flex items-center gap-2 text-white/80 mb-3'
              : 'flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-3'
          }>
            <div className={
              highlighted
                ? 'h-7 w-7 rounded-md bg-white/15 grid place-items-center'
                : 'h-7 w-7 rounded-md bg-brand-gradient grid place-items-center shadow-sm shadow-primary/20'
            }>
              <Sparkles className={highlighted ? 'h-3.5 w-3.5 text-white' : 'h-3.5 w-3.5 text-white'} />
            </div>
            <span className="text-xs uppercase tracking-wider">
              {highlighted ? 'Latest insight' : 'Insight'}
            </span>
            <span className={
              highlighted
                ? 'ml-auto text-xs flex items-center gap-1 text-white/70'
                : 'ml-auto text-xs flex items-center gap-1'
            }>
              <Clock className="h-3 w-3" />
              {formatTime(ts)}
            </span>
          </div>
          <p className={
            highlighted
              ? 'text-white text-base md:text-lg leading-relaxed max-w-prose'
              : 'text-zinc-800 dark:text-zinc-200 text-sm md:text-base leading-relaxed max-w-prose whitespace-pre-wrap'
          }>
            {message}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatTime(ts) {
  if (!ts || isNaN(new Date(ts))) return 'just now';
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.round((now - d) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default AIInsights;
