import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import StaffPage from './pages/StaffPage';
import UserPage from './pages/UserPage';

export function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)); }
      catch { localStorage.removeItem('token'); localStorage.removeItem('user'); }
    }
    setLoading(false);
  }, []);

  const handleLogin = (loggedInUser, _token) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Starting SmartPark AI…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → Login page
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Route by role
  if (user.role === 'admin') {
    return <AdminPage user={user} onLogout={handleLogout} />;
  }

  if (user.role === 'staff') {
    return <StaffPage user={user} onLogout={handleLogout} />;
  }

  // Default: customer
  return <UserPage user={user} onLogout={handleLogout} />;
}