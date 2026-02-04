import "./assets/styles/bootstrap.min.css";
import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, AuthContext } from "./context/AuthContext";
import { TransactionProvider } from "./context/TransactionContext";

import Navbar from "./components/Navbar/Navbar";

import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import Dashboard from "./pages/Dashboard/Dashboard";
import Transactions from "./pages/Transactions/Transactions";
import Budgets from "./pages/Budgets/Budgets";
import Profile from "./pages/Profile/Profile";
import AIInsights from "./pages/AIInsights/AIInsights";
import OAuthSuccess from "./pages/OAuth/OAuthSuccess";
import SetPassword from "./pages/SetPassword/SetPassword";


import "./App.css";

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" replace />;
};

// Prevent logged-in users from visiting login/signup
const PublicOnly = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <TransactionProvider>
        <Router>
          <AuthWrapper />
        </Router>
      </TransactionProvider>
    </AuthProvider>
  );
}

const AuthWrapper = () => {
  const { user } = useContext(AuthContext);

  return (
    <>
      {user && <Navbar />}
      <div className="app-layout">
        <main className="main-content">
          <Routes>
            {/* OAuth redirect page */}
            <Route path="/oauth-success" element={<OAuthSuccess />} />
            <Route path="/set-password" element={<SetPassword />} />

            {/* Public Routes */}
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />

            {/* Default */}
            <Route
              path="*"
              element={
                window.location.pathname.startsWith("/set-password")
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
