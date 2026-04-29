import React, { useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Sparkles, RefreshCw } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import chatService from '../../services/chatService';
import { AppLayout } from '../../components/app-layout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../lib/utils';

const SUGGESTIONS = [
  'How am I doing this month?',
  'Where can I cut spending?',
  'Am I on track with my budgets?',
  'What did I spend on food last month?',
];

const HISTORY_CAP = 20;

const Chat = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setError(null);
    setInput('');

    // Optimistic user message
    const next = [...messages, { role: 'user', content: message }];
    setMessages(next);
    setSending(true);

    try {
      const history = next.slice(-HISTORY_CAP - 1, -1); // exclude the new message
      const res = await chatService.send({ message, history });
      setMessages([...next, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const msg =
        status === 429
          ? 'You are sending messages too quickly. Wait a moment and try again.'
          : err?.response?.data?.message || 'Failed to get a reply. Try again.';
      setError(msg);
      // Roll back the optimistic user turn so retry isn't double-sent
      setMessages(messages);
    } finally {
      setSending(false);
      // Refocus input
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <AppLayout>
      <header className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI Assistant
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Ask Finora</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Ground your questions in your real transactions and budgets.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="h-4 w-4" /> New chat
          </Button>
        )}
      </header>

      <div className="flex flex-col min-h-[calc(100vh-12rem)]">
        {/* Messages scroll area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 min-h-[360px]"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.length === 0 ? (
              <EmptyState onSuggestion={(s) => send(s)} userName={user?.name} />
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <Bubble key={i} role={m.role} content={m.content} />
                ))}
              </AnimatePresence>
            )}
            {sending && <ThinkingBubble />}
          </div>

          {/* Input */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 bg-zinc-50/50 dark:bg-zinc-950/30">
            {error && (
              <div className="mb-2 px-3 py-2 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask anything about your money…"
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'min-h-[44px] max-h-[140px]'
                )}
                disabled={sending}
                autoFocus
              />
              <Button
                type="submit"
                variant="gradient"
                size="icon"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="h-11 w-11 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 text-center">
              Press Enter to send, Shift+Enter for a new line
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

function Bubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-brand-gradient grid place-items-center flex-shrink-0 shadow-sm shadow-primary/30">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[80%] sm:max-w-[70%] whitespace-pre-wrap',
          isUser
            ? 'bg-brand-gradient text-white rounded-br-sm shadow-md shadow-primary/20'
            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 rounded-bl-sm'
        )}
      >
        {content}
      </div>
    </motion.div>
  );
}

function ThinkingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 justify-start"
    >
      <div className="h-8 w-8 rounded-full bg-brand-gradient grid place-items-center flex-shrink-0 shadow-sm shadow-primary/30">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-zinc-100 dark:bg-zinc-900 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function EmptyState({ onSuggestion, userName }) {
  return (
    <div className="h-full grid place-items-center px-2 py-6">
      <div className="text-center max-w-md">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-gradient grid place-items-center shadow-lg shadow-primary/30 mb-4">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Hi {userName?.split(' ')[0] || 'there'} — what would you like to know?
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
          Try one of these to get started, or type your own question below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <motion.button
              key={s}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSuggestion(s)}
              className={cn(
                'text-left text-sm px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800',
                'hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10',
                'text-zinc-700 dark:text-zinc-300 transition-colors'
              )}
            >
              {s}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Chat;
