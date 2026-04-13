import { useState, useEffect, useCallback, useRef } from 'react';
import { mockApi } from '../mockApi';
import { Toast, ExtendModal, SpotModal, CountdownBadge, getSpotColor, fmtDateTime, useCountdown } from '../components/shared';

// ─── My Booking Card ───────────────────────────────────────────────────────────
function MyBookingCard({ session, spot, onExtend, onCheckout }) {
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(session.end_time);
  const totalDuration = session.duration_hours * 3600 * 1000;
  const used = totalDuration - (new Date(session.end_time).getTime() - Date.now());
  const usedPct = Math.min(100, Math.max(0, (used / totalDuration) * 100));

  const cardBg = expired ? 'border-red-300 bg-red-50' : critical ? 'border-red-200 bg-red-50' : warning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm transition-all ${cardBg}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{session.spot_number}</span>
            <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-semibold">Zone {session.zone_name}</span>
            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{spot?.spot_type || 'regular'}</span>
          </div>
          <p className="text-sm text-slate-500 font-mono">{session.license_plate}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Rate</p>
          <p className="font-bold text-slate-900">${spot?.hourly_rate || 5}/hr</p>
        </div>
      </div>

      {/* Countdown */}
      <div className={`rounded-xl p-3 text-center mb-4 ${expired ? 'bg-red-100' : critical ? 'bg-red-100' : warning ? 'bg-amber-100' : 'bg-slate-50'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${expired ? 'text-red-700' : critical ? 'text-red-600' : warning ? 'text-amber-600' : 'text-slate-500'}`}>
          {expired ? '🚨 EXPIRED' : critical ? '🔴 CRITICAL' : warning ? '⚠ Expiring Soon' : '⏱ Time Remaining'}
        </p>
        {expired ? (
          <p className="text-2xl font-bold text-red-700">00:00:00</p>
        ) : (
          <p className={`text-3xl font-mono font-bold tracking-widest ${critical ? 'text-red-600 animate-pulse' : warning ? 'text-amber-600' : 'text-slate-800'}`}>
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
        )}
        <div className="mt-2">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${expired ? 'bg-red-500' : critical ? 'bg-red-400' : warning ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${usedPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Entry: {new Date(session.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>End: {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-center">
        <div className="bg-slate-50 rounded-lg p-2"><p className="font-bold text-slate-900">{session.duration_hours}h</p><p className="text-slate-500">Booked</p></div>
        <div className="bg-orange-50 rounded-lg p-2"><p className="font-bold text-orange-600">{session.total_extended_hours || 0}h</p><p className="text-slate-500">Extended</p></div>
        <div className="bg-blue-50 rounded-lg p-2"><p className="font-bold text-blue-700">${(spot?.hourly_rate || 5) * session.duration_hours}</p><p className="text-slate-500">Est. Cost</p></div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={onExtend}
          className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2">
          ⏱ Extend Time
        </button>
        <button onClick={onCheckout}
          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          🚪 Check Out
        </button>
      </div>
    </div>
  );
}

// ─── Checkout Confirm Modal ────────────────────────────────────────────────────
function CheckoutModal({ session, spot, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const actualHours = Math.max(1, Math.ceil((Date.now() - new Date(session.entry_time).getTime()) / 3600000));
  const cost = actualHours * (spot?.hourly_rate || 5);

  const doConfirm = async () => { setBusy(true); await onConfirm(); setBusy(false); };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
          <h3 className="text-white font-bold text-lg">Confirm Check-Out</h3>
          <p className="text-white/70 text-sm">Spot {session.spot_number} · {session.license_plate}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Entry time</span><span className="font-medium">{new Date(session.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Actual duration</span><span className="font-medium">{actualHours}h</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rate</span><span className="font-medium">${spot?.hourly_rate || 5}/hr</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-bold text-slate-700">Total Amount Due</span>
              <span className="font-bold text-green-700 text-xl">${cost}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
            <button onClick={doConfirm} disabled={busy} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? 'Processing…' : `Pay $${cost} & Exit`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('map');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
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
      const [sp, zo, us] = await Promise.all([mockApi.getSpotList(), mockApi.getZones(), mockApi.getUserSessions(user.id)]);
      setSpots(sp.data.spots);
      setZones(zo.data.zones);
      setAllSessions(us.data.sessions);
    } catch { showNotif('error', 'Failed to refresh'); }
    finally { setLoading(false); }
  }, [user.id, showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    refreshRef.current = setInterval(fetchData, 15000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchData]);

  const myActiveSessions = allSessions.filter(s => s.duration_minutes === 0 && s.bookedByUserId === user.id);
  const myHistory = allSessions.filter(s => s.duration_minutes > 0 && s.bookedByUserId === user.id);

  const handleEntry = async (licensePlate, durationHours) => {
    if (!selectedSpot) return;
    try {
      await mockApi.checkIn(licensePlate, selectedSpot.id, durationHours, user.id);
      await fetchData(); setSelectedSpot(null);
      showNotif('success', `✅ Spot ${selectedSpot.spot_number} booked for ${durationHours}h!`);
      setActiveTab('mybookings');
    } catch (err) { showNotif('error', err.message); }
  };

  const handleCheckout = async () => {
    if (!checkoutSession) return;
    try {
      const r = await mockApi.checkOut(checkoutSession.license_plate);
      await fetchData(); setCheckoutSession(null);
      showNotif('success', `✅ Checked out! Paid $${r.data.total_amount}`);
      setActiveTab('history');
    } catch (err) { showNotif('error', err.message); }
  };

  const handleExtend = async (extraHours) => {
    if (!extendSpot) return;
    try {
      await mockApi.extendBooking(extendSpot.id, extraHours);
      await fetchData();
      const updated = mockApi.getSpots().find(s => s.id === extendSpot.id);
      if (updated) setExtendSpot(updated);
      showNotif('success', `⏱ Extended by ${extraHours}h!`);
    } catch (err) { showNotif('error', err.message); }
  };

  const criticalCount = myActiveSessions.filter(s => new Date(s.end_time).getTime() - Date.now() < 5 * 60 * 1000).length;
  const warningCount = myActiveSessions.filter(s => {
    const rem = new Date(s.end_time).getTime() - Date.now();
    return rem > 0 && rem < 15 * 60 * 1000;
  }).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-slate-600">Loading your dashboard…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Toast notif={notif} />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M8 4v16M16 4v16M2 12h20" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">SmartPark</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Customer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {criticalCount > 0 && <span className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-full animate-pulse">🔴 {criticalCount} critical</span>}
            {warningCount > 0 && criticalCount === 0 && <span className="text-xs bg-amber-100 text-amber-700 font-medium px-3 py-1.5 rounded-full">⚠ {warningCount} expiring</span>}
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">{user.full_name[0]}</div>
              <span className="text-sm font-medium text-slate-700">{user.full_name}</span>
            </div>
            <button onClick={onLogout} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">Logout</button>
          </div>
        </div>

        {/* Nav */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 py-1">
            {[
              { id: 'map', label: 'Book a Spot', icon: '🗺️' },
              { id: 'mybookings', label: `My Bookings${myActiveSessions.length ? ` (${myActiveSessions.length})` : ''}`, icon: '🅿️' },
              { id: 'history', label: 'History', icon: '📋' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Book a Spot (Map) Tab ── */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Find & Book a Spot</h2>
              <p className="text-slate-500 text-sm">Click any green spot to start a booking</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-3xl font-bold text-green-600">{spots.filter(s => !s.is_occupied && !s.is_reserved).length}</p>
                <p className="text-xs text-slate-500 mt-1">Available</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-3xl font-bold text-red-500">{spots.filter(s => s.is_occupied).length}</p>
                <p className="text-xs text-slate-500 mt-1">Occupied</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-3xl font-bold text-emerald-600">{spots.filter(s => s.spot_type === 'electric' && !s.is_occupied).length}</p>
                <p className="text-xs text-slate-500 mt-1">EV Free</p>
              </div>
            </div>

            {/* Zones grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {zones.map(zone => (
                <div key={zone.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Zone {zone.name}</h3>
                      <p className="text-xs text-slate-500">{zone.available_spots} of {zone.total_spots} free</p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${zone.available_spots === 0 ? 'bg-red-100 text-red-700' : zone.available_spots < 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {zone.available_spots === 0 ? 'Full' : zone.available_spots < 3 ? 'Almost Full' : 'Available'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" style={{ width: `${(zone.occupied_spots / zone.total_spots) * 100}%` }} />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {spots.filter(s => s.zone_id === zone.id).map(spot => (
                      <button key={spot.id}
                        onClick={() => !spot.is_occupied && !spot.is_reserved ? setSelectedSpot(spot) : null}
                        disabled={spot.is_occupied || spot.is_reserved}
                        className={`aspect-square rounded-lg ${getSpotColor(spot)} transition-all duration-200 flex flex-col items-center justify-center shadow-sm ${!spot.is_occupied ? 'hover:scale-105' : 'cursor-not-allowed opacity-80'} relative`}>
                        <span className="text-[8px] font-bold text-white leading-tight drop-shadow">{spot.spot_number}</span>
                        {spot.is_occupied && spot.booking && !spot.booking.expired && <CountdownBadge endTime={spot.booking.endTime} />}
                        {spot.booking?.expired && <span className="text-[7px] text-red-200 font-bold">EXP</span>}
                        {spot.spot_type === 'electric' && !spot.is_occupied && (
                          <svg className="w-2.5 h-2.5 text-emerald-600 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-4 text-xs">
              {[
                { color: 'bg-green-400', label: 'Available (click to book)' },
                { color: 'bg-red-500', label: 'Occupied' },
                { color: 'bg-amber-500', label: '<15m left' },
                { color: 'bg-red-600', label: '<5m (critical)' },
                { color: 'bg-emerald-200 border border-emerald-400', label: 'EV Charging' },
              ].map(l => <span key={l.label} className="flex items-center gap-2 text-slate-600"><span className={`w-3.5 h-3.5 rounded ${l.color}`}></span>{l.label}</span>)}
            </div>
          </div>
        )}

        {/* ── My Bookings Tab ── */}
        {activeTab === 'mybookings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Active Bookings</h2>
              <p className="text-slate-500 text-sm">{myActiveSessions.length} active booking{myActiveSessions.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Urgency banners */}
            {criticalCount > 0 && (
              <div className="bg-red-600 rounded-2xl p-4 flex items-center gap-3 text-white">
                <span className="text-2xl animate-pulse">🚨</span>
                <div>
                  <p className="font-bold">{criticalCount} booking{criticalCount > 1 ? 's' : ''} expiring in under 5 minutes!</p>
                  <p className="text-sm text-red-100">Use the Extend button below before the spot is released.</p>
                </div>
              </div>
            )}
            {warningCount > 0 && criticalCount === 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="font-semibold text-amber-800">{warningCount} booking{warningCount > 1 ? 's' : ''} expiring within 15 minutes — consider extending.</p>
              </div>
            )}

            {myActiveSessions.length > 0 ? (
              <div className="space-y-4">
                {myActiveSessions.map(session => {
                  const spot = spots.find(s => s.spot_number === session.spot_number);
                  return (
                    <MyBookingCard
                      key={session.id}
                      session={session}
                      spot={spot}
                      onExtend={() => { if (spot) setExtendSpot(spot); }}
                      onCheckout={() => setCheckoutSession(session)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-6xl mb-4">🅿️</div>
                <h3 className="text-slate-700 font-semibold text-lg mb-2">No Active Bookings</h3>
                <p className="text-slate-400 text-sm mb-6">Book a parking spot from the map to get started.</p>
                <button onClick={() => setActiveTab('map')} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all">
                  🗺️ Find a Spot
                </button>
              </div>
            )}

            {/* How it works */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-3">How to Extend Your Booking</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-800">
                {[
                  '1️⃣ Click "Extend Time" on any active booking card',
                  '2️⃣ Choose extra hours from quick presets or stepper',
                  '3️⃣ Preview cost and new end time before confirming',
                  '4️⃣ Extension is applied instantly to your slot',
                  '⚠️ Warning shown when under 15 minutes remain',
                  '🔴 Critical alert when under 5 minutes remain',
                ].map(t => <div key={t} className="flex items-start gap-2"><span>{t.slice(0, 2)}</span><span>{t.slice(2)}</span></div>)}
              </div>
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Parking History</h2>
              <p className="text-slate-500 text-sm">{myHistory.length} completed session{myHistory.length !== 1 ? 's' : ''} · Total spent: ${myHistory.reduce((s, x) => s + (x.total_amount || 0), 0).toFixed(2)}</p>
            </div>

            {myHistory.length > 0 ? (
              <div className="space-y-3">
                {myHistory.slice().reverse().map(session => {
                  const spot = spots.find(s => s.spot_number === session.spot_number);
                  return (
                    <div key={session.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm shrink-0">✓</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-slate-900">{session.spot_number}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">Zone {session.zone_name}</span>
                          <span className="font-mono text-xs text-slate-500">{session.license_plate}</span>
                        </div>
                        <p className="text-xs text-slate-400">{fmtDateTime(session.entry_time)} · {session.duration_hours}h parked</p>
                        {(session.total_extended_hours || 0) > 0 && (
                          <p className="text-xs text-orange-500">+{session.total_extended_hours}h extended</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-700 text-lg">${session.total_amount?.toFixed(2) || (session.duration_hours * (spot?.hourly_rate || 5)).toFixed(2)}</p>
                        <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Paid</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-slate-700 font-semibold text-lg mb-2">No History Yet</h3>
                <p className="text-slate-400 text-sm">Your completed parking sessions will appear here.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Spot booking modal — user can only book available spots */}
      {selectedSpot && !selectedSpot.is_occupied && (
        <SpotModal spot={selectedSpot} sessions={[]} onClose={() => setSelectedSpot(null)}
          onEntry={handleEntry} onExit={async () => {}} onOpenExtend={() => {}} userView={true} />
      )}

      {/* Extend modal */}
      {extendSpot && extendSpot.booking && (
        <ExtendModal spot={extendSpot} onClose={() => setExtendSpot(null)} onExtend={handleExtend} />
      )}

      {/* Checkout modal */}
      {checkoutSession && (
        <CheckoutModal
          session={checkoutSession}
          spot={spots.find(s => s.spot_number === checkoutSession.spot_number)}
          onConfirm={handleCheckout}
          onCancel={() => setCheckoutSession(null)}
        />
      )}
    </div>
  );
}