import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Download, Trash2, Lock, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../../components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

/**
 * Static privacy + data-rights page. Mounted at /privacy. Public
 * (no auth) so a prospective user can read it before signing up.
 *
 * Content-wise this is the absolute minimum that a real fintech-style
 * product would have to publish. Not legal advice — but it documents
 * what the app actually does (transactions stored on Supabase, prompts
 * sent to Gemini for AI features) and the data rights endpoints we
 * provide.
 */
const Section = ({ icon: Icon, title, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="mb-8"
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    </div>
    <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-2">
      {children}
    </div>
  </motion.section>
);

const Privacy = () => {
  return (
    <AppLayout>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
          <Shield className="h-3 w-3" /> Privacy
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">How Finora handles your data</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Last updated: 2026-04-30
        </p>
      </header>

      <Section icon={Database} title="What we store">
        <p>
          Finora stores the data you enter — your name and email, your
          transactions and budgets, AI-generated insights, and the login
          history we use to detect brute-force attempts.
        </p>
        <p>
          Money amounts are stored in plaintext (BigDecimal in Postgres) so
          we can compute on them. Passwords are stored as BCrypt hashes,
          never in plaintext. Password-reset tokens are stored as SHA-256
          hashes; the original token only ever leaves the system once, in
          the reset email.
        </p>
      </Section>

      <Section icon={Lock} title="Where it lives">
        <ul className="list-disc list-inside space-y-1">
          <li>Postgres on Supabase (encrypted at rest, TLS in transit)</li>
          <li>Redis Cloud for the read-through cache (5-minute TTL)</li>
          <li>Sentry for error reports — payload data is scrubbed before send</li>
          <li>Vercel + Render for the frontend / backend hosts</li>
        </ul>
        <p>
          Nothing of yours is stored on our laptops or in source control.
        </p>
      </Section>

      <Section icon={Shield} title="What goes to the AI provider">
        <p>
          When you use the chat or generate an AI insight, we send a prompt
          to Google Gemini. The prompt includes the relevant subset of your
          transactions and budgets so the answer is grounded in your actual
          data. Identifying details (your real name, email, account ids)
          are not sent — Gemini sees a financial picture, not a person.
        </p>
        <p>
          Responses are cached for one hour against the prompt text in
          Redis to avoid burning quota on repeat questions; nothing about
          who asked is retained at the cache layer.
        </p>
      </Section>

      <Section icon={Download} title="Your data — export & delete">
        <p>
          Two endpoints, scoped to whoever's signed in:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs">
              GET /api/users/me/export
            </code>{' '}
            — downloads a JSON file with every row we hold for you. The
            "Export my data" button on the Profile page invokes this.
          </li>
          <li>
            <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs">
              DELETE /api/users/me
            </code>{' '}
            — wipes your account, transactions, budgets, insights, login
            history, and any pgvector embeddings derived from your
            transactions. There is no soft-delete; once it's gone we can't
            restore it.
          </li>
        </ul>
        <p>
          Both are also available via the{' '}
          <Link to="/profile" className="text-primary hover:underline">
            Profile page
          </Link>{' '}
          if you'd rather click than curl.
        </p>
      </Section>

      <Section icon={Trash2} title="Retention">
        <p>
          We don't auto-delete anything for you. If you stop using the
          account, your data persists until you actively delete it.
          Login-history rows older than 12 months may be pruned in the
          future — we'll update this page if and when.
        </p>
      </Section>

      <Card className="mt-12">
        <CardHeader>
          <CardTitle>Questions?</CardTitle>
          <CardDescription>
            Email{' '}
            <a className="text-primary hover:underline" href="mailto:patelkarma28@gmail.com">
              patelkarma28@gmail.com
            </a>
            . This is a portfolio project — there's no SLA, but we'll
            answer.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </AppLayout>
  );
};

export default Privacy;
