import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';

/**
 * 404 page. Mounted as the fallback at the end of the route table —
 * before this commit, an unknown URL silently bounced to /dashboard
 * (or /login if not signed in), which made typos invisible. A typo
 * surfacing as "you went home" is worse UX than admitting we couldn't
 * find what they asked for.
 *
 * Uses brand styling so it doesn't feel like a server error page.
 */
const NotFound = () => {
  const { user } = useContext(AuthContext);
  const homeHref = user ? '/dashboard' : '/login';
  const homeLabel = user ? 'Back to dashboard' : 'Back to sign in';

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-gradient grid place-items-center shadow-lg shadow-primary/30 mb-6">
          <Search className="h-7 w-7 text-white" />
        </div>
        <p className="text-7xl font-semibold tracking-tight bg-clip-text text-transparent bg-brand-gradient mb-2">
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          That page took a wrong turn
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          We can't find <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[0.85em]">{window.location.pathname}</code>.
          It may have been moved, or the URL might be a typo.
        </p>
        <Button asChild variant="gradient" size="lg" className="shadow-lg shadow-primary/30">
          <Link to={homeHref}>
            <Home className="h-4 w-4" /> {homeLabel}
          </Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
