import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://smart-parking-api-zbno.onrender.com/api';

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export default function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    username: '', email: '', full_name: '', phone: '', password: '', confirm: ''
  });

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin && form.password !== form.confirm) throw new Error("Passwords don't match");
      
      let response;
      if (isLogin) {
        const loginData = {
          email: form.username.includes('@') ? form.username : `${form.username}@placeholder.com`,
          password: form.password
        };
        response = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(loginData)
        });
      } else {
        response = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: form.full_name,
            email: form.email,
            password: form.password
          })
        });
      }

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (!isLogin) setSuccess('Account created successfully!');
      setTimeout(() => onLogin(user, token), isLogin ? 0 : 1000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 flex items-center justify-center p-4">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-50 blur-[120px]" />
        <div className="absolute top-[60%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-50 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        {/* ParkHub Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-blue-500 rounded-xl flex items-center justify-center font-bold text-white text-lg">PH</div>
            <span className="font-bold tracking-tight text-white text-xl">Park<span className="text-blue-400">Hub</span></span>
          </div>
          <div className="text-[11px] text-slate-300 bg-white/10 px-2 py-1 rounded-full font-medium">v2.0</div>
        </div>

        {/* Main Content */}
        <div className="p-6 md:p-8">
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-bold text-slate-900">
              {isLogin ? 'Welcome back' : 'Join ParkHub'}
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              {isLogin ? 'Sign in to your ParkHub account' : 'Create your account in seconds'}
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 mb-4">
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm flex items-center gap-2 mb-4">
              <span>✓</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registration Extra Fields */}
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Full name</label>
                    <input 
                      type="text" required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all outline-none"
                      placeholder="Alex Rivera"
                      onChange={e => updateForm('full_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Phone</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all outline-none"
                      placeholder="+1 555 123 4567"
                      onChange={e => updateForm('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all outline-none"
                    placeholder="parkmaster"
                    onChange={e => updateForm('username', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Email / Username Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                {isLogin ? 'Email or username' : 'Email address'}
              </label>
              <input 
                type={isLogin ? "text" : "email"} required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all outline-none"
                placeholder={isLogin ? "hello@parkhub.com or parkuser" : "you@example.com"}
                onChange={e => updateForm(isLogin ? 'username' : 'email', e.target.value)}
              />
            </div>

            {/* Password Fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                <input 
                  type="password" required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all outline-none"
                  placeholder="········"
                  onChange={e => updateForm('password', e.target.value)}
                />
              </div>
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Confirm password</label>
                  <input 
                    type="password" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 transition-all outline-none"
                    placeholder="········"
                    onChange={e => updateForm('confirm', e.target.value)}
                  />
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm tracking-wide uppercase hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md mt-2"
            >
              {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
              className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>

          {/* Feature Hints */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">✓ Live occupancy</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1">✓ Quick entry</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1">✓ Smart spots</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
