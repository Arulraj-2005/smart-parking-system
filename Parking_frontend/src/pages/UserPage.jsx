import { useState, useEffect, useCallback } from 'react';
import { Toast, ExtendModal, SpotModal, getSpotColor, fmtDateTime } from '../components/shared';

const API_URL = import.meta.env.VITE_API_URL || 'https://smart-parking-api-zbno.onrender.com/api';

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

// ─── Stats Card ──────────────────────────────────────────────────────────────
function StatsCard({ title, value, icon, color }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
      <div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', letterSpacing: '0.5px' }}>{title}</p>
        <p style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{value}</p>
      </div>
      <div style={{
        width: '48px',
        height: '48px',
        background: `${color}10`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
      }}>
        {icon}
      </div>
    </div>
  );
}

// ─── Revenue Chart ───────────────────────────────────────────────────────────
function RevenueChart({ data }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              height: '120px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '40px',
                height: `${(item.revenue / maxRevenue) * 100}%`,
                background: '#3b82f6',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.5s ease',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1e40af'
                }}>
                  ₹{item.revenue}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────
export default function AdminPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [extendSpot, setExtendSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const [dateRange, setDateRange] = useState('week');

  const showNotif = useCallback((type, message) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      console.log('🔄 Fetching admin data...');
      
      const [spotsData, zonesData, sessionsData, usersData] = await Promise.all([
        apiRequest('/parking/spots'),
        apiRequest('/parking/zones'),
        apiRequest('/admin/sessions'),
        apiRequest('/admin/users')
      ]);
      
      setSpots(spotsData.data?.spots || []);
      setZones(zonesData.data?.zones || []);
      setSessions(sessionsData.sessions || sessionsData.data?.sessions || []);
      setUsers(usersData.users || usersData.data?.users || []);
      
      console.log('✅ Admin data refreshed');
    } catch (err) {
      console.error('❌ Fetch error:', err);
      showNotif('error', 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calculate dashboard stats
  const totalSpots = spots.length;
  const occupiedSpots = spots.filter(s => s.is_occupied).length;
  const availableSpots = spots.filter(s => !s.is_occupied && !s.is_reserved).length;
  const reservedSpots = spots.filter(s => s.is_reserved).length;
  
  const activeSessions = sessions.filter(s => s.payment_status === 'pending').length;
  const completedSessions = sessions.filter(s => s.payment_status === 'paid').length;
  
  // Calculate revenue based on date range
  const getRevenueData = () => {
    const now = new Date();
    let daysToShow = 7;
    if (dateRange === 'month') daysToShow = 30;
    if (dateRange === 'year') daysToShow = 365;
    
    const revenueMap = new Map();
    
    sessions.filter(s => s.payment_status === 'paid').forEach(session => {
      const date = new Date(session.exit_time || session.end_time);
      const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= daysToShow) {
        let key;
        if (dateRange === 'week') key = date.toLocaleDateString('en-US', { weekday: 'short' });
        else if (dateRange === 'month') key = `${date.getDate()}/${date.getMonth() + 1}`;
        else key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const amount = session.total_amount || 0;
        revenueMap.set(key, (revenueMap.get(key) || 0) + amount);
      }
    });
    
    // Generate labels
    let labels = [];
    if (dateRange === 'week') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    } else if (dateRange === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
      }
    }
    
    return labels.map(label => ({
      label,
      revenue: revenueMap.get(label) || 0
    }));
  };

  const revenueData = getRevenueData();
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  
  const occupancyRate = totalSpots > 0 ? ((occupiedSpots / totalSpots) * 100).toFixed(1) : 0;

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'spots', label: 'Parking Spots' },
    { id: 'sessions', label: 'Active Sessions' },
    { id: 'history', label: 'History' },
    { id: 'users', label: 'Users' }
  ];

  const mono = { fontFamily: "'DM Mono', 'Courier New', monospace" };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', ...mono }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #1d4ed8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ marginTop: '12px', color: '#64748b', fontSize: '13px', letterSpacing: '1px' }}>LOADING ADMIN PANEL...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', ...mono }}>
      <Toast notif={notif} />

      <header style={{
        background: '#0f172a',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        borderBottom: '3px solid #dc2626'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', background: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '16px', color: '#fff', borderRadius: '3px',
              letterSpacing: '-1px',
            }}>A</div>
            <div>
              <p style={{ color: '#f8fafc', fontWeight: 800, fontSize: '15px', letterSpacing: '1px' }}>SMARTPARK ADMIN</p>
              <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '1.5px', marginTop: '-2px' }}>MANAGEMENT PORTAL</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{user?.email}</span>
            <button onClick={onLogout} style={{
              padding: '6px 14px', background: 'transparent',
              border: '1px solid #dc2626', color: '#f87171',
              borderRadius: '3px', fontSize: '11px', cursor: 'pointer',
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              LOGOUT
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', gap: '0', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 18px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '1px',
              color: activeTab === tab.id ? '#f87171' : '#64748b',
              borderBottom: activeTab === tab.id ? '3px solid #dc2626' : '3px solid transparent',
              transition: 'color 0.15s',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap'
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Dashboard</h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Real-time parking overview</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <StatsCard title="Total Spots" value={totalSpots} icon="🅿" color="#3b82f6" />
              <StatsCard title="Available" value={availableSpots} icon="✅" color="#10b981" />
              <StatsCard title="Occupied" value={occupiedSpots} icon="🚗" color="#ef4444" />
              <StatsCard title="Occupancy Rate" value={`${occupancyRate}%`} icon="📊" color="#8b5cf6" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Revenue Overview</h3>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>Total Revenue</p>
                    <p style={{ fontSize: '36px', fontWeight: 800, color: '#16a34a' }}>₹{totalRevenue.toLocaleString()}</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
                    {['week', 'month', 'year'].map(range => (
                      <button
                        key={range}
                        onClick={() => setDateRange(range)}
                        style={{
                          padding: '6px 12px',
                          background: dateRange === range ? '#3b82f6' : '#f1f5f9',
                          color: dateRange === range ? '#fff' : '#64748b',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                  
                  <RevenueChart data={revenueData} />
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Session Summary</h3>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                      <p style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6' }}>{activeSessions}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Active</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>{completedSessions}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Completed</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6' }}>{users.length}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Users</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h3 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Sessions</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Spot</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>License</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Entry</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 5).map(session => (
                      <tr key={session.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{session.spot_number}</td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>{session.license_plate}</td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>{fmtDateTime(session.entry_time)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: session.payment_status === 'pending' ? '#fef3c7' : '#d1fae5',
                            color: session.payment_status === 'pending' ? '#92400e' : '#065f46'
                          }}>
                            {session.payment_status === 'pending' ? 'ACTIVE' : 'COMPLETED'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                          ₹{session.total_amount || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SPOTS TAB */}
        {activeTab === 'spots' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Parking Spots</h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Manage all parking spots</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {zones.map(zone => {
                const zoneSpots = spots.filter(s => s.zone_id === zone.id);
                return (
                  <div key={zone.id} style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#f8fafc',
                      padding: '12px 16px',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <h3 style={{ fontWeight: 800, fontSize: '16px' }}>Zone {zone.name}</h3>
                      <p style={{ fontSize: '11px', color: '#64748b' }}>{zone.total_spots} spots · ₹{zone.hourly_rate}/hr</p>
                    </div>
                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {zoneSpots.map(spot => (
                        <button
                          key={spot.id}
                          onClick={() => setSelectedSpot(spot)}
                          style={{
                            aspectRatio: '1',
                            background: spot.is_occupied ? '#ef4444' : spot.is_reserved ? '#f59e0b' : '#10b981',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'transform 0.1s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {spot.spot_number}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ACTIVE SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Active Sessions</h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>{activeSessions} currently active</p>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Spot</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>License Plate</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>User</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Entry Time</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Duration</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.filter(s => s.payment_status === 'pending').map(session => (
                      <tr key={session.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{session.spot_number}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{session.license_plate}</td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>{session.user_email || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '12px' }}>{fmtDateTime(session.entry_time)}</td>
                        <td style={{ padding: '12px 16px', fontSize: '12px' }}>{session.duration_hours}h</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              const spot = spots.find(s => s.spot_number === session.spot_number);
                              setExtendSpot({ ...spot, booking: { endTime: session.end_time, licensePlate: session.license_plate } });
                            }}
                            style={{
                              padding: '4px 10px',
                              background: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            Extend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB - FIXED */}
        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Session History</h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>All completed sessions</p>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Spot</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>License</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>User</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Entry → Exit</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Duration</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.filter(s => s.payment_status === 'paid').length > 0 ? (
                      sessions.filter(s => s.payment_status === 'paid').map(session => (
                        <tr key={session.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{session.spot_number}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{session.license_plate}</td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>{session.user_email || 'N/A'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '11px' }}>
                            {fmtDateTime(session.entry_time)} → {session.exit_time ? fmtDateTime(session.exit_time) : 'N/A'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '12px' }}>{session.duration_hours}h</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>
                            ₹{session.total_amount ? session.total_amount.toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                          No completed sessions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Users</h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>All registered users</p>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Email</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Role</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Joined</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{user.full_name || user.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>{user.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: user.role === 'admin' ? '#fee2e2' : '#dbeafe',
                            color: user.role === 'admin' ? '#991b1b' : '#1e40af'
                          }}>
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                          {user.created_at ? fmtDateTime(user.created_at) : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                          {user.session_count || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedSpot && (
        <SpotModal
          spot={selectedSpot}
          sessions={sessions.filter(s => s.spot_number === selectedSpot.spot_number && s.payment_status === 'pending')}
          onClose={() => setSelectedSpot(null)}
          onEntry={() => {}}
          onExit={async () => {
            await fetchData();
            setSelectedSpot(null);
            showNotif('success', 'Session ended successfully');
          }}
          onOpenExtend={(spot) => setExtendSpot(spot)}
        />
      )}

      {extendSpot && (
        <ExtendModal
          spot={extendSpot}
          onClose={() => setExtendSpot(null)}
          onExtend={async (extraHours) => {
            try {
              await apiRequest('/parking/extend', {
                method: 'POST',
                body: JSON.stringify({ spotId: extendSpot.id, extraHours }),
              });
              await fetchData();
              showNotif('success', `Extended by ${extraHours} hours`);
              setExtendSpot(null);
            } catch (err) {
              showNotif('error', err.message);
            }
          }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
