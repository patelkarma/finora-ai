import "./assets/styles/bootstrap.min.css";
import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProvider } from "./components/theme-provider";

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
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <Router>
          <AuthWrapper />
        </Router>
      </AuthProvider>
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

            {/* Default */}
            <Route
              path="*"
              element={
                loading ? null :
                (window.location.pathname.startsWith("/set-password") ||
                 window.location.pathname.startsWith("/create-password"))
                  ? <SetPassword />
                  : <Navigate to={user ? "/dashboard" : "/login"} replace />
              }
            />

          </Routes>
        </main>
      </div>
    </>
  );
};

export default App;
