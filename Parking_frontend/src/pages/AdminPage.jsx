import { useState, useEffect, useCallback, useRef } from 'react';
import { Toast, ExtendModal, SpotModal, BookingTimerRow, CountdownBadge, getSpotColor, fmtDateTime } from '../components/shared';

const API_URL = import.meta.env.VITE_API_URL || 'https://smart-parking-api-zbno.onrender.com/api';

// Helper function for API calls
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ─── Completed Session Row ─────────────────────────────────────────────────────
function CompletedRow({ session }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="py-2.5 px-4 text-sm font-mono font-bold text-slate-700">{session.license_plate}</td>
      <td className="py-2.5 px-4 text-sm text-slate-600">{session.spot_number}</td>
      <td className="py-2.5 px-4 text-sm text-slate-600">Zone {session.zone_name}</td>
      <td className="py-2.5 px-4 text-sm text-slate-600">{session.duration_hours}h</td>
      <td className="py-2.5 px-4 text-sm text-slate-600">{fmtDateTime(session.entry_time)}</td>
      <td className="py-2.5 px-4 text-sm font-bold text-green-700">${session.total_amount?.toFixed(2) || (session.duration_hours * 5).toFixed(2)}</td>
      <td className="py-2.5 px-4">
        <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-1 font-semibold">Completed</span>
      </td>
    </tr>
  );
}

// ─── User Management Row ───────────────────────────────────────────────────────
function UserRow({ u, currentUserId, onRoleChange, onDelete }) {
  const roleColors = {
    admin: 'bg-red-100 text-red-700 border-red-200',
    staff: 'bg-amber-100 text-amber-700 border-amber-200',
    customer: 'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="py-3 px-4 text-sm font-bold text-slate-900">{u.full_name}</td>
      <td className="py-3 px-4 text-sm font-mono text-slate-600">@{u.username}</td>
      <td className="py-3 px-4 text-sm text-slate-500">{u.email}</td>
      <td className="py-3 px-4 text-sm text-slate-500">{u.phone || '—'}</td>
      <td className="py-3 px-4">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${roleColors[u.role]}`}>{u.role}</span>
      </td>
      <td className="py-3 px-4">
        {u.id !== currentUserId ? (
          <div className="flex items-center gap-2">
            <select value={u.role} onChange={e => onRoleChange(u.id, e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={() => onDelete(u.id)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Current user</span>
        )}
      </td>
    </tr>
  );
}

export default function AdminPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [extendSpot, setExtendSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const refreshRef = useRef(null);

  const showNotif = useCallback((type, message) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [spotsData, zonesData, statsData, sessionsData, allSessionsData, usersData] = await Promise.all([
        apiRequest('/parking/spots'),
        apiRequest('/parking/zones'),
        apiRequest('/admin/stats'),
        apiRequest('/parking/sessions/active'),
        apiRequest('/parking/sessions/all'),
        apiRequest('/admin/users'),
      ]);
      setSpots(spotsData.data?.spots || []);
      setZones(zonesData.data?.zones || []);
      setStats(statsData.data?.stats || null);
      setSessions(sessionsData.data?.sessions || []);
      setAllSessions(allSessionsData.data?.sessions || []);
      setUsers(usersData.data?.users || []);
    } catch (err) {
      showNotif('error', 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    refreshRef.current = setInterval(fetchData, 15000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchData]);

  const handleEntry = async (licensePlate, durationHours) => {
    if (!selectedSpot) return;
    try {
      await apiRequest('/parking/book', {
        method: 'POST',
        body: JSON.stringify({ spotId: selectedSpot.id, licensePlate, durationHours })
      });
      await fetchData();
      setSelectedSpot(null);
      showNotif('success', `Spot ${selectedSpot.spot_number} booked for ${durationHours}h`);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleExit = async () => {
    if (!selectedSpot) return;
    const session = sessions.find(s => s.spot_number === selectedSpot.spot_number && s.duration_minutes === 0);
    if (!session) {
      showNotif('error', 'No active session');
      return;
    }
    try {
      await apiRequest('/parking/checkout', {
        method: 'POST',
        body: JSON.stringify({ sessionId: session.id })
      });
      await fetchData();
      setSelectedSpot(null);
      showNotif('success', 'Checked out successfully');
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleExtend = async (extraHours) => {
    const target = extendSpot || selectedSpot;
    if (!target) return;
    try {
      await apiRequest('/parking/extend', {
        method: 'POST',
        body: JSON.stringify({ spotId: target.id, extraHours })
      });
      await fetchData();
      showNotif('success', `Extended by ${extraHours}h`);
      setExtendSpot(null);
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await apiRequest('/admin/users/role', {
        method: 'PUT',
        body: JSON.stringify({ userId: id, role })
      });
      await fetchData();
      showNotif('success', 'Role updated');
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
      await fetchData();
      showNotif('warn', 'User removed');
    } catch (err) {
      showNotif('error', err.message);
    }
  };

  const activeSessions = sessions.filter(s => s.duration_minutes === 0);
  const completedSessions = allSessions.filter(s => s.duration_minutes > 0);
  const criticalCount = spots.filter(s => s.booking && !s.booking.expired && new Date(s.booking.endTime).getTime() - Date.now() < 5 * 60 * 1000).length;
  const warningCount = spots.filter(s => s.booking && !s.booking.expired && new Date(s.booking.endTime).getTime() - Date.now() < 15 * 60 * 1000).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'parking', label: 'Parking Map', icon: '🗺️' },
    { id: 'bookings', label: `Bookings (${activeSessions.length})`, icon: '🕐' },
    { id: 'history', label: 'History', icon: '📋' },
    { id: 'users', label: `Users (${users.length})`, icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-slate-600">Loading admin panel...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast notif={notif} />

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-blue-900 text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M8 4v16M16 4v16M2 12h20" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">SmartPark AI</h1>
              <p className="text-xs text-white/50 -mt-0.5">Admin Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {criticalCount > 0 && <span className="hidden sm:flex text-xs bg-red-500 text-white px-3 py-1.5 rounded-full font-bold animate-pulse">CRITICAL {criticalCount}</span>}
            {warningCount > criticalCount && <span className="hidden sm:flex text-xs bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full font-medium">Expiring {warningCount}</span>}
            <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
              <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-sm font-bold">{user.full_name?.[0] || user.name?.[0]}</div>
              <div>
                <p className="text-sm font-semibold">{user.full_name || user.name}</p>
                <p className="text-xs text-white/60 capitalize">{user.role}</p>
              </div>
            </div>
            <button onClick={onLogout} className="px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20">Logout</button>
          </div>
        </div>

        {/* Nav */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex gap-1 pb-2">
            {navItems.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
              <p className="text-slate-500 text-sm">System overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Total Spots', value: stats.totalSpots, sub: 'Across 4 zones', icon: 'P', from: 'from-blue-500', to: 'to-indigo-600' },
                { title: 'Available', value: stats.availableSpots, sub: 'Ready to book', icon: 'A', from: 'from-green-500', to: 'to-emerald-600' },
                { title: 'Occupied', value: stats.occupiedSpots, sub: `${stats.occupancyRate}% occupancy`, icon: 'O', from: 'from-red-500', to: 'to-rose-600' },
                { title: "Today's Revenue", value: `$${stats.todayRevenue.toFixed(2)}`, sub: `${stats.todayVehicles} sessions`, icon: '$', from: 'from-amber-500', to: 'to-orange-600' },
              ].map(c => (
                <div key={c.title} className={`bg-gradient-to-br ${c.from} ${c.to} rounded-2xl p-5 text-white shadow-lg`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/70 text-sm">{c.title}</p>
                      <p className="text-3xl font-bold mt-1">{c.value}</p>
                      <p className="text-white/60 text-xs mt-1">{c.sub}</p>
                    </div>
                    <span className="text-3xl">{c.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {(criticalCount > 0 || warningCount > 0) && (
              <div className="space-y-3">
                {criticalCount > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl animate-pulse">!</span>
                    <div className="flex-1"><p className="font-bold text-red-800">{criticalCount} booking{criticalCount > 1 ? 's' : ''} expiring in under 5 minutes!</p><p className="text-sm text-red-600">Extend immediately to prevent auto-release.</p></div>
                    <button onClick={() => setActiveTab('bookings')} className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 whitespace-nowrap">View & Extend →</button>
                  </div>
                )}
                {warningCount > criticalCount && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1"><p className="font-bold text-amber-800">{warningCount} booking{warningCount > 1 ? 's' : ''} expiring within 15 minutes</p></div>
                    <button onClick={() => setActiveTab('bookings')} className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 whitespace-nowrap">Manage →</button>
                  </div>
                )}
              </div>
            )}

            {/* Occupancy bar */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">Live Occupancy</h3>
                <span className="text-lg font-bold text-blue-600">{stats.occupancyRate}%</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${stats.occupancyRate}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>{stats.availableSpots} available</span>
                <span>{stats.occupiedSpots} occupied</span>
                <span>{stats.reservedSpots} reserved</span>
              </div>
            </div>

            {/* Active sessions table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Active Bookings</h3>
                <span className="text-sm text-slate-500">{activeSessions.length} active</span>
              </div>
              {activeSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="text-left py-3 px-4">Plate</th>
                        <th className="text-left py-3 px-4">Spot</th>
                        <th className="text-left py-3 px-4">Zone</th>
                        <th className="text-left py-3 px-4">Duration</th>
                        <th className="text-left py-3 px-4">Entry</th>
                        <th className="text-left py-3 px-4">Time Left</th>
                        <th className="text-left py-3 px-4">Cost</th>
                        <th className="text-left py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSessions.map(s => <BookingTimerRow key={s.id} session={s} spots={spots} onExtend={spot => setExtendSpot(spot)} />)}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-slate-400 text-center py-8">No active bookings.</p>}
            </div>
          </div>
        )}

        {/* Parking Map Tab */}
        {activeTab === 'parking' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-2xl font-bold text-slate-900">Parking Map</h2><p className="text-slate-500 text-sm">Click any spot to book, check out, or extend</p></div>
              <button onClick={fetchData} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm">
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {zones.map(zone => (
                <div key={zone.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div><h3 className="font-bold text-slate-900 text-lg">Zone {zone.name}</h3><p className="text-xs text-slate-500">{zone.available_spots}/{zone.total_spots} available</p></div>
                    <span className="text-sm font-bold text-slate-700">{Math.round((zone.occupied_spots / zone.total_spots) * 100)}% full</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" style={{ width: `${(zone.occupied_spots / zone.total_spots) * 100}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {spots.filter(s => s.zone_id === zone.id).map(spot => (
                      <button key={spot.id} onClick={() => setSelectedSpot(spot)}
                        className={`aspect-square rounded-lg ${getSpotColor(spot)} transition-all duration-200 flex flex-col items-center justify-center shadow-sm hover:scale-105 relative`}>
                        <span className="text-[9px] font-bold text-white leading-tight drop-shadow">{spot.spot_number}</span>
                        {spot.is_occupied && spot.booking && !spot.booking.expired && <CountdownBadge endTime={spot.booking.endTime} />}
                        {spot.booking?.expired && <span className="text-[8px] text-red-200 font-bold">EXP</span>}
                        {spot.spot_type === 'electric' && !spot.is_occupied && <svg className="w-3 h-3 text-emerald-600 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-4 text-sm">
              {[
                { color: 'bg-green-400', label: 'Available' },
                { color: 'bg-red-500', label: 'Occupied' },
                { color: 'bg-amber-500', label: 'Expiring <15m' },
                { color: 'bg-red-600 animate-pulse', label: 'Critical <5m' },
                { color: 'bg-red-900', label: 'Expired' },
                { color: 'bg-emerald-200 border border-emerald-400', label: 'EV Free' },
                { color: 'bg-purple-200 border border-purple-400', label: 'Motorcycle' },
              ].map(l => <span key={l.label} className="flex items-center gap-2 text-slate-600"><span className={`w-4 h-4 rounded ${l.color}`}></span>{l.label}</span>)}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-2xl font-bold text-slate-900">Active Bookings</h2><p className="text-slate-500 text-sm">{activeSessions.length} vehicles currently parked</p></div>
            </div>
            {criticalCount > 0 && <div className="bg-red-600 rounded-2xl p-4 flex items-center gap-3 text-white animate-pulse"><span className="text-2xl">!</span><p className="font-bold">{criticalCount} booking{criticalCount > 1 ? 's' : ''} CRITICAL — extend now!</p></div>}
            {warningCount > criticalCount && <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3"><span className="text-2xl">⚠️</span><p className="font-semibold text-amber-800">{warningCount} expiring within 15 minutes</p></div>}
            {activeSessions.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="text-left py-4 px-4">Plate</th>
                        <th className="text-left py-4 px-4">Spot</th>
                        <th className="text-left py-4 px-4">Zone</th>
                        <th className="text-left py-4 px-4">Duration</th>
                        <th className="text-left py-4 px-4">Entry</th>
                        <th className="text-left py-4 px-4">Time Remaining</th>
                        <th className="text-left py-4 px-4">Est. Cost</th>
                        <th className="text-left py-4 px-4">Extend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSessions.map(s => <BookingTimerRow key={s.id} session={s} spots={spots} onExtend={spot => setExtendSpot(spot)} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-5xl mb-4">P</div>
                <p className="text-slate-600 font-medium">No active bookings</p>
                <button onClick={() => setActiveTab('parking')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Open Parking Map</button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-bold text-slate-900">Session History</h2><p className="text-slate-500 text-sm">{completedSessions.length} completed sessions · Total revenue: ${completedSessions.reduce((s, x) => s + (x.total_amount || 0), 0).toFixed(2)}</p></div>
            {completedSessions.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="text-left py-3 px-4">Plate</th>
                        <th className="text-left py-3 px-4">Spot</th>
                        <th className="text-left py-3 px-4">Zone</th>
                        <th className="text-left py-3 px-4">Duration</th>
                        <th className="text-left py-3 px-4">Entry</th>
                        <th className="text-left py-3 px-4">Revenue</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSessions.slice().reverse().map(s => <CompletedRow key={s.id} session={s} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 text-slate-400">No completed sessions yet.</div>}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-2xl font-bold text-slate-900">User Management</h2><p className="text-slate-500 text-sm">{users.length} registered users</p></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {['admin', 'staff', 'customer'].map(role => {
                const count = users.filter(u => u.role === role).length;
                const colors = { admin: { bg: 'bg-red-50', txt: 'text-red-700' }, staff: { bg: 'bg-amber-50', txt: 'text-amber-700' }, customer: { bg: 'bg-green-50', txt: 'text-green-700' } };
                return (
                  <div key={role} className={`${colors[role].bg} rounded-2xl p-4 border border-white shadow-sm`}>
                    <p className={`text-2xl font-bold ${colors[role].txt}`}>{count}</p>
                    <p className="text-slate-500 text-sm capitalize mt-1">{role}s</p>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Username</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => <UserRow key={u.id} u={u} currentUserId={user.id} onRoleChange={handleRoleChange} onDelete={handleDeleteUser} />)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && stats && (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-bold text-slate-900">Analytics & Reports</h2></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donut */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                <h3 className="font-semibold text-slate-900 mb-4 self-start">Occupancy Rate</h3>
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" stroke="#e2e8f0" strokeWidth="28" fill="none" />
                    <circle cx="100" cy="100" r="80" stroke="#3b82f6" strokeWidth="28" fill="none"
                      strokeDasharray={`${(stats.occupancyRate / 100) * 502} 502`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-3xl font-bold text-slate-900">{stats.occupancyRate}%</p>
                    <p className="text-xs text-slate-500">Occupied</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 w-full text-center text-sm">
                  <div><p className="text-2xl font-bold text-green-600">{stats.availableSpots}</p><p className="text-slate-500 text-xs">Free</p></div>
                  <div><p className="text-2xl font-bold text-red-500">{stats.occupiedSpots}</p><p className="text-slate-500 text-xs">Occupied</p></div>
                  <div><p className="text-2xl font-bold text-orange-500">{stats.reservedSpots}</p><p className="text-slate-500 text-xs">Reserved</p></div>
                </div>
              </div>

              {/* Zone bars */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4">Zone Occupancy</h3>
                <div className="space-y-4">
                  {zones.map(z => (
                    <div key={z.id}>
                      <div className="flex justify-between text-sm mb-1"><span className="font-medium text-slate-700">Zone {z.name}</span><span className="font-bold">{z.occupied_spots}/{z.total_spots}</span></div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${(z.occupied_spots / z.total_spots) * 100}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{Math.round((z.occupied_spots / z.total_spots) * 100)}% full</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue summary */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4">Revenue Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-green-50 rounded-xl p-3">
                    <span className="text-slate-600 text-sm">Completed Sessions</span>
                    <span className="font-bold text-green-700">${completedSessions.reduce((s, x) => s + (x.total_amount || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-50 rounded-xl p-3">
                    <span className="text-slate-600 text-sm">Active Sessions (est.)</span>
                    <span className="font-bold text-blue-700">${activeSessions.reduce((s, sess) => {
                      const mins = (Date.now() - new Date(sess.entry_time).getTime()) / 60000;
                      return s + (mins / 60) * 5;
                    }, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-100 rounded-xl p-3 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Total Revenue</span>
                    <span className="font-bold text-slate-900 text-lg">${stats.todayRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Spot type */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4">Spot Type Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['regular', 'electric', 'motorcycle', 'handicapped'].map(type => {
                    const typeSpots = spots.filter(s => s.spot_type === type);
                    const occupied = typeSpots.filter(s => s.is_occupied).length;
                    const pct = typeSpots.length > 0 ? Math.round((occupied / typeSpots.length) * 100) : 0;
                    const cm = {
                      regular: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
                      electric: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
                      motorcycle: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
                      handicapped: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
                    };
                    const c = cm[type];
                    return (
                      <div key={type} className={`rounded-xl p-4 ${c.bg}`}>
                        <p className="text-xs text-slate-500 capitalize mb-1">{type}</p>
                        <p className={`text-2xl font-bold ${c.text}`}>{occupied}/{typeSpots.length}</p>
                        <div className="h-1.5 bg-white/60 rounded-full mt-2 overflow-hidden"><div className={`h-full ${c.bar} rounded-full`} style={{ width: `${pct}%` }} /></div>
                        <p className="text-xs text-slate-400 mt-1">{pct}% occupied</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedSpot && (
        <SpotModal spot={selectedSpot} sessions={sessions} onClose={() => setSelectedSpot(null)}
          onEntry={handleEntry} onExit={handleExit}
          onOpenExtend={() => { setExtendSpot(selectedSpot); setSelectedSpot(null); }} />
      )}
      {extendSpot && extendSpot.booking && (
        <ExtendModal spot={extendSpot} onClose={() => setExtendSpot(null)} onExtend={handleExtend} />
      )}
    </div>
  );
}