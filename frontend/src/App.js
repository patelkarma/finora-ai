import "./assets/styles/bootstrap.min.css";
import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/toast";
import ErrorBoundary from "./components/error-boundary";

// Navigation now lives inside AppLayout (sidebar on desktop, top-bar on
// mobile), so we no longer mount a global Navbar at the App level.

import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import Dashboard from "./pages/Dashboard/Dashboard";
import Transactions from "./pages/Transactions/Transactions";
import Budgets from "./pages/Budgets/Budgets";
import Profile from "./pages/Profile/Profile";
import AIInsights from "./pages/AIInsights/AIInsights";
import Chat from "./pages/Chat/Chat";
import OAuthSuccess from "./pages/OAuth/OAuthSuccess";
import SetPassword from "./pages/SetPassword/SetPassword";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import DesignPreview from "./pages/DesignPreview/DesignPreview";
import Privacy from "./pages/Privacy/Privacy";
import NotFound from "./pages/NotFound/NotFound";


import "./App.css";

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

// Prevent logged-in users from visiting login/signup
const PublicOnly = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  // ErrorBoundary wraps the rest so any render-time throw inside Toaster /
  // AuthProvider / a page component lands on the branded fallback rather
  // than React's default white screen. Theme provider stays outside so
  // the fallback inherits the user's dark/light preference.
  return (
    <ThemeProvider defaultTheme="dark">
      <ErrorBoundary>
        <Toaster>
          <AuthProvider>
            <Router>
              <AuthWrapper />
            </Router>
          </AuthProvider>
        </Toaster>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const AuthWrapper = () => {
  const { user, loading } = useContext(AuthContext);

  return (
    <>
      <div className="app-layout">
        <main className="main-content">
          <Routes>
            {/* Design preview — public, no auth, used during Phase 2.7 to
                iterate on the new design system before migrating pages. */}
            <Route path="/design-preview" element={<DesignPreview />} />

            {/* Privacy + data-rights — public so users can read it before signing up. */}
            <Route path="/privacy" element={<Privacy />} />

            {/* OAuth redirect page */}
            <Route path="/oauth-success" element={<OAuthSuccess />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/create-password" element={<SetPassword />} />

            {/* Public Routes */}
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

            {/* Salary aliases → Profile */}
            <Route path="/salary" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/enter-salary" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Root route — known to redirect (signed-in to dashboard,
                signed-out to login). Distinct from arbitrary unknown
                URLs which now show a real 404. */}
            <Route
              path="/"
              element={
                loading ? null : <Navigate to={user ? "/dashboard" : "/login"} replace />
              }
            />

            {/* SetPassword's legacy paths used to land on the wildcard
                with a path-prefix check; explicit routes are clearer
                and let the wildcard mean "actually not found". */}
            <Route path="/set-password/*" element={<SetPassword />} />
            <Route path="/create-password/*" element={<SetPassword />} />

            {/* Catch-all 404. Shows a branded NotFound page rather than
                silently bouncing to /dashboard, which made typos
                invisible. */}
            <Route path="*" element={loading ? null : <NotFound />} />

          </Routes>
        </main>
      </div>
    </>
  );
};

export default App;
