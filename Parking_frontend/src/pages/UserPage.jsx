import { useState, useEffect, useCallback, useRef } from 'react';
import { Toast, ExtendModal, SpotModal, CountdownBadge, getSpotColor, fmtDateTime, useCountdown } from '../components/shared';

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

// ─── Active Booking Card ────────────────────────────────────────────────────
function MyBookingCard({ session, spot, onExtend, onCheckout }) {
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(session.end_time);
  const totalDuration = session.duration_hours * 3600 * 1000;
  const used = totalDuration - (new Date(session.end_time).getTime() - Date.now());
  const usedPct = Math.min(100, Math.max(0, (used / totalDuration) * 100));

  const statusColor = expired
    ? { bar: '#dc2626', bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' }
    : critical
    ? { bar: '#ef4444', bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c' }
    : warning
    ? { bar: '#d97706', bg: '#fffbeb', border: '#fcd34d', text: '#92400e' }
    : { bar: '#1d4ed8', bg: '#f8fafc', border: '#cbd5e1', text: '#1e3a5f' };

  return (
    <div style={{
      border: `2px solid ${statusColor.border}`,
      backgroundColor: statusColor.bg,
      borderRadius: '6px',
      padding: '16px',
      fontFamily: "'DM Mono', 'Courier New', monospace",
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>
              {session.spot_number}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '1px', color: '#475569',
              background: '#e2e8f0', padding: '2px 8px', borderRadius: '2px'
            }}>
              ZONE {session.zone_name}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', letterSpacing: '1px' }}>
            {session.license_plate}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Rate</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            ₹{spot?.hourly_rate || 50}/hr
          </p>
        </div>
      </div>

      {/* Countdown block */}
      <div style={{
        backgroundColor: statusColor.bg,
        border: `1px solid ${statusColor.border}`,
        padding: '12px',
        marginBottom: '14px',
        textAlign: 'center',
        borderRadius: '4px',
      }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '2px', marginBottom: '6px', color: statusColor.text
        }}>
          {expired ? '⚠ SESSION EXPIRED' : critical ? '⚠ UNDER 5 MIN' : warning ? 'EXPIRING SOON' : 'TIME LEFT'}
        </p>
        <p style={{
          fontSize: '32px', fontWeight: 700, letterSpacing: '4px',
          color: expired || critical ? '#dc2626' : warning ? '#b45309' : '#1e3a5f',
          animation: critical && !expired ? 'pulse 1s infinite' : 'none',
        }}>
          {expired ? '00:00:00' : `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
        </p>

        {/* Progress bar — raw/utilitarian */}
        <div style={{ marginTop: '10px', height: '6px', background: '#e2e8f0', borderRadius: '0' }}>
          <div style={{
            height: '100%', width: `${usedPct}%`,
            background: statusColor.bar,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onExtend} style={{
          flex: 1, padding: '10px',
          background: '#1d4ed8', color: '#fff',
          border: 'none', borderRadius: '4px',
          fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          + Extend
        </button>
        <button onClick={onCheckout} style={{
          flex: 1, padding: '10px',
          background: '#fff', color: '#dc2626',
          border: '2px solid #dc2626', borderRadius: '4px',
          fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          Check Out
        </button>
      </div>
    </div>
  );
}

// ─── Checkout Modal ─────────────────────────────────────────────────────────
function CheckoutModal({ session, spot, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const actualHours = Math.max(1, Math.ceil((Date.now() - new Date(session.entry_time).getTime()) / 3600000));
  const cost = actualHours * (spot?.hourly_rate || 50);

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '16px',
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: '360px',
        borderRadius: '6px', overflow: 'hidden',
        border: '2px solid #0f172a',
        fontFamily: "'DM Mono', 'Courier New', monospace",
      }}>
        {/* Header stripe */}
        <div style={{ background: '#0f172a', padding: '16px 20px' }}>
          <p style={{ color: '#f8fafc', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            CONFIRM CHECKOUT
          </p>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            {session.spot_number} · {session.license_plate}
          </p>
        </div>

        {/* Breakdown */}
        <div style={{ padding: '20px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '14px', marginBottom: '16px' }}>
            {[
              ['Entry Time', new Date(session.entry_time).toLocaleTimeString('en-IN')],
              ['Duration', `${actualHours} hr`],
              ['Rate', `₹${spot?.hourly_rate || 50}/hr`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{label}</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <div style={{
              borderTop: '2px dashed #e2e8f0', paddingTop: '10px', marginTop: '6px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Total Due
              </span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>₹{cost}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onCancel} style={{
              flex: 1, padding: '12px',
              background: '#fff', color: '#475569',
              border: '1.5px solid #cbd5e1', borderRadius: '4px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={busy} style={{
              flex: 1, padding: '12px',
              background: busy ? '#94a3b8' : '#16a34a', color: '#fff',
              border: 'none', borderRadius: '4px',
              fontSize: '13px', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {busy ? 'Processing…' : `Pay ₹${cost}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────
function StatPill({ value, label, color }) {
  return (
    <div style={{
      background: '#fff', border: `2px solid ${color}20`,
      borderLeft: `4px solid ${color}`,
      padding: '12px 16px', borderRadius: '4px',
      fontFamily: "'DM Mono', 'Courier New', monospace",
    }}>
      <p style={{ fontSize: '26px', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function UserPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('map');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [extendSpot, setExtendSpot] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const refreshRef = useRef(null);

  const showNotif = useCallback((type, message) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [spotsData, zonesData, sessionsData] = await Promise.all([
        apiRequest('/parking/spots'),
        apiRequest('/parking/zones'),
        apiRequest('/parking/sessions/my'),
      ]);
      setSpots(spotsData.data?.spots || []);
      setZones(zonesData.data?.zones || []);
      const allSessions = sessionsData.sessions || sessionsData.data?.sessions || [];
      setActiveSessions(allSessions.filter(s => s.payment_status === 'pending'));
      setCompletedSessions(allSessions.filter(s => s.payment_status === 'paid'));
    } catch {
      showNotif('error', 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    refreshRef.current = setInterval(fetchData, 10000);
    return () => clearInterval(refreshRef.current);
  }, [fetchData]);

  const handleBooking = async (licensePlate, durationHours) => {
    if (!selectedSpot) return;
    try {
      await apiRequest('/parking/book', {
        method: 'POST',
        body: JSON.stringify({ spotId: selectedSpot.id, licensePlate, durationHours }),
      });
      await fetchData();
      setSelectedSpot(null);
      showNotif('success', `Spot ${selectedSpot.spot_number} booked for ${durationHours}h!`);
      setActiveTab('mybookings');
    } catch (err) { showNotif('error', err.message); }
  };

  const handleCheckout = async () => {
    if (!checkoutSession) return;
    try {
      await apiRequest('/parking/checkout', {
        method: 'POST',
        body: JSON.stringify({ sessionId: checkoutSession.id }),
      });
      await fetchData();
      setCheckoutSession(null);
      showNotif('success', 'Checked out successfully!');
      setActiveTab('history');
    } catch (err) { showNotif('error', err.message); }
  };

  const handleExtend = async (extraHours) => {
    if (!extendSpot) return;
    try {
      await apiRequest('/parking/extend', {
        method: 'POST',
        body: JSON.stringify({ spotId: extendSpot.id, extraHours }),
      });
      await fetchData();
      showNotif('success', `Extended by ${extraHours} hours!`);
      setExtendSpot(null);
    } catch (err) { showNotif('error', err.message); }
  };

  const availableSpots = spots.filter(s => !s.is_occupied && !s.is_reserved).length;
  const occupiedSpots = spots.filter(s => s.is_occupied).length;
  const evFreeSpots = spots.filter(s => s.spot_type === 'electric' && !s.is_occupied).length;

  const TABS = [
    { id: 'map', label: 'Book a Spot' },
    { id: 'mybookings', label: `Bookings (${activeSessions.length})` },
    { id: 'history', label: 'History' },
  ];

  const mono = { fontFamily: "'DM Mono', 'Courier New', monospace" };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', ...mono }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #1d4ed8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ marginTop: '12px', color: '#64748b', fontSize: '13px', letterSpacing: '1px' }}>LOADING…</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', ...mono }}>
      <Toast notif={notif} />

      {/* ── Header ── */}
      <header style={{
        background: '#0f172a', position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '3px solid #1d4ed8',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', background: '#1d4ed8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '16px', color: '#fff', borderRadius: '3px',
              letterSpacing: '-1px',
            }}>P</div>
            <div>
              <p style={{ color: '#f8fafc', fontWeight: 800, fontSize: '15px', letterSpacing: '1px' }}>SMARTPARK</p>
              <p style={{ color: '#64748b', fontSize: '10px', letterSpacing: '1.5px', marginTop: '-2px' }}>CUSTOMER PORTAL</p>
            </div>
          </div>
          <button onClick={onLogout} style={{
            padding: '6px 14px', background: 'transparent',
            border: '1px solid #dc2626', color: '#f87171',
            borderRadius: '3px', fontSize: '11px', cursor: 'pointer',
            letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            LOGOUT
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px', display: 'flex', gap: '0' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 18px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '1px',
              color: activeTab === tab.id ? '#60a5fa' : '#64748b',
              borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'color 0.15s',
              fontFamily: 'inherit',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Book a Spot ── */}
        {activeTab === 'map' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Find & Book a Spot</h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', letterSpacing: '0.5px' }}>Select any available slot below</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <StatPill value={availableSpots} label="Available" color="#16a34a" />
              <StatPill value={occupiedSpots} label="Occupied" color="#dc2626" />
              <StatPill value={evFreeSpots} label="EV Free" color="#0ea5e9" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {zones.map(zone => {
                const zoneSpots = spots.filter(s => s.zone_id === zone.id);
                const available = zoneSpots.filter(s => !s.is_occupied && !s.is_reserved).length;
                return (
                  <div key={zone.id} style={{
                    background: '#fff', border: '1.5px solid #e2e8f0',
                    borderTop: '3px solid #1d4ed8',
                    padding: '16px', borderRadius: '4px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px', letterSpacing: '0.5px' }}>
                          ZONE {zone.name}
                        </h3>
                        <p style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.5px' }}>
                          {available}/{zone.total_spots} free
                        </p>
                      </div>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: available > 0 ? '#dcfce7' : '#fee2e2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 800,
                        color: available > 0 ? '#16a34a' : '#dc2626',
                      }}>
                        {available}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {zoneSpots.map(spot => {
                        const free = !spot.is_occupied && !spot.is_reserved;
                        return (
                          <button
                            key={spot.id}
                            onClick={() => free ? setSelectedSpot(spot) : null}
                            disabled={!free}
                            style={{
                              aspectRatio: '1',
                              background: free ? '#1d4ed8' : spot.is_reserved ? '#d97706' : '#64748b',
                              border: free ? '2px solid #1e40af' : '2px solid transparent',
                              borderRadius: '3px',
                              cursor: free ? 'pointer' : 'not-allowed',
                              fontSize: '9px', fontWeight: 700, color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              letterSpacing: '0.3px',
                              opacity: free ? 1 : 0.6,
                              transition: 'transform 0.1s',
                              fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => free && (e.currentTarget.style.transform = 'scale(1.08)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            {spot.spot_number}
                            {spot.is_occupied && spot.booking && !spot.booking.expired && (
                              <CountdownBadge endTime={spot.booking.endTime} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── My Bookings ── */}
        {activeTab === 'mybookings' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Active Bookings</h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', letterSpacing: '0.5px' }}>
                {activeSessions.length} session{activeSessions.length !== 1 ? 's' : ''} active
              </p>
            </div>

            {activeSessions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeSessions.map(session => {
                  const spot = spots.find(s => s.spot_number === session.spot_number);
                  return (
                    <MyBookingCard
                      key={session.id}
                      session={session}
                      spot={spot}
                      onExtend={() => setExtendSpot(spot)}
                      onCheckout={() => setCheckoutSession(session)}
                    />
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: '#fff', border: '1.5px solid #e2e8f0',
                borderRadius: '4px', padding: '48px 24px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '36px', marginBottom: '10px' }}>🅿</p>
                <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px', marginBottom: '6px' }}>No Active Bookings</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '18px' }}>Book a parking slot to get started</p>
                <button onClick={() => setActiveTab('map')} style={{
                  padding: '10px 24px', background: '#1d4ed8', color: '#fff',
                  border: 'none', borderRadius: '3px', fontSize: '12px',
                  fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase',
                  letterSpacing: '1px', fontFamily: 'inherit',
                }}>
                  Find a Spot →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── History ── */}
        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Parking History</h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', letterSpacing: '0.5px' }}>
                {completedSessions.length} completed session{completedSessions.length !== 1 ? 's' : ''}
              </p>
            </div>

            {completedSessions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedSessions.map(session => {
                  const amount = typeof session.total_amount === 'number'
                    ? session.total_amount.toFixed(2)
                    : (session.total_amount || '0');
                  return (
                    <div key={session.id} style={{
                      background: '#fff', border: '1.5px solid #e2e8f0',
                      borderLeft: '4px solid #16a34a',
                      borderRadius: '4px', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '14px',
                    }}>
                      <div style={{
                        width: '36px', height: '36px', background: '#f0fdf4',
                        border: '1.5px solid #bbf7d0',
                        borderRadius: '3px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#16a34a',
                        fontSize: '16px', flexShrink: 0,
                      }}>✓</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                            Spot {session.spot_number}
                          </span>
                          <span style={{
                            fontSize: '10px', color: '#475569',
                            background: '#f1f5f9', padding: '1px 6px',
                            borderRadius: '2px', fontWeight: 600, letterSpacing: '0.5px',
                          }}>
                            ZONE {session.zone_name}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                          {fmtDateTime(session.entry_time)} · {session.duration_hours}h
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: '#16a34a', fontSize: '16px' }}>₹{amount}</p>
                        <span style={{
                          fontSize: '10px', color: '#16a34a',
                          background: '#f0fdf4', padding: '1px 6px',
                          borderRadius: '2px', fontWeight: 700, letterSpacing: '0.5px',
                        }}>PAID</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: '#fff', border: '1.5px solid #e2e8f0',
                borderRadius: '4px', padding: '48px 24px', textAlign: 'center',
              }}>
                <p style={{ fontSize: '36px', marginBottom: '10px' }}>📋</p>
                <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px', marginBottom: '6px' }}>No History Yet</p>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Completed sessions will appear here.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {selectedSpot && !selectedSpot.is_occupied && (
        <SpotModal
          spot={selectedSpot}
          sessions={[]}
          onClose={() => setSelectedSpot(null)}
          onEntry={handleBooking}
          onExit={async () => {}}
          onOpenExtend={() => {}}
          userView={true}
        />
      )}

      {extendSpot && (
        <ExtendModal
          spot={extendSpot}
          onClose={() => setExtendSpot(null)}
          onExtend={handleExtend}
        />
      )}

      {checkoutSession && (
        <CheckoutModal
          session={checkoutSession}
          spot={spots.find(s => s.spot_number === checkoutSession.spot_number)}
          onConfirm={handleCheckout}
          onCancel={() => setCheckoutSession(null)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}