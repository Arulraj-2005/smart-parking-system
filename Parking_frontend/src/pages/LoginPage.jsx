import { useState } from 'react';
import { mockApi } from '../mockApi';

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
      
      const response = isLogin 
        ? await mockApi.login(form.username, form.password)
        : await mockApi.register(form);

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
    <div className="min-h-screen bg-[#fafafa] text-slate-900 selection:bg-blue-100 flex items-center justify-center p-4">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-50 blur-[120px]" />
        <div className="absolute top-[60%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-50 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[1100px] grid lg:grid-cols-12 gap-0 bg-white border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden">
        
        {/* Left Side: Brand & Social Proof */}
        <div className="lg:col-span-5 bg-slate-900 p-10 lg:p-16 flex flex-col justify-between text-white">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center font-bold text-xl">S</div>
              <span className="font-bold tracking-tight text-xl">SmartPark<span className="text-blue-400">.ai</span></span>
            </div>
            
            <h2 className="text-4xl font-medium leading-[1.1] mb-6">
              Precision parking <br /> 
              <span className="text-slate-400 italic font-serif">driven by data.</span>
            </h2>
            
            <ul className="space-y-5">
              {[
                { title: 'Live Occupancy', desc: 'Real-time sensor integration' },
                { title: 'Predictive Analytics', desc: 'Know spot availability before you arrive' },
                { title: 'Seamless Access', desc: 'Automated entry via plate recognition' }
              ].map((item, i) => (
                <li key={i} className="group cursor-default">
                  <h4 className="text-blue-400 font-semibold text-sm mb-1 group-hover:text-blue-300 transition-colors">{item.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex -space-x-3 mb-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-900 bg-slate-700 overflow-hidden">
                   <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 italic">"The most intuitive parking management I've ever used."</p>
          </div>
        </div>

        {/* Right Side: Interactive Form */}
        <div className="lg:col-span-7 p-8 lg:p-16">
          <div className="max-w-md mx-auto">
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {isLogin ? 'Welcome back' : 'Get started for free'}
              </h3>
              <p className="text-slate-500">
                {isLogin ? 'Enter your credentials to access your dashboard' : 'Join 2,000+ users optimizing their daily commute'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Conditional Registration Fields */}
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                    <input 
                      type="text" required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="Jane Doe"
                      onChange={e => updateForm('full_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Phone</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="+1..."
                      onChange={e => updateForm('phone', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                  {isLogin ? 'Username / Email' : 'Email Address'}
                </label>
                <input 
                  type={isLogin ? "text" : "email"} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder={isLogin ? "admin" : "jane@company.com"}
                  onChange={e => updateForm(isLogin ? 'username' : 'email', e.target.value)}
                />
              </div>

              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    placeholder="janedoe123"
                    onChange={e => updateForm('username', e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                  <input 
                    type="password" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    placeholder="••••••••"
                    onChange={e => updateForm('password', e.target.value)}
                  />
                </div>
                {!isLogin && (
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Confirm</label>
                    <input 
                      type="password" required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="••••••••"
                      onChange={e => updateForm('confirm', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>}
              {success && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm flex items-center gap-2">
                <span>✅</span> {success}
              </div>}

              <button 
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm tracking-wide uppercase hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors"
              >
                {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}