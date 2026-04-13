import { useState, useEffect, useCallback, useRef } from 'react';
import { mockApi } from '../mockApi';
import { Toast, ExtendModal, SpotModal, BookingTimerRow, CountdownBadge, getSpotColor } from '../components/shared';

export default function StaffPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('parking');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [sessions, setSessions] = useState([]);
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
      const [sp, zo, se] = await Promise.all([mockApi.getSpotList(), mockApi.getZones(), mockApi.getActiveSessions()]);
      setSpots(sp.data.spots);
      setZones(zo.data.zones);
      setSessions(se.data.sessions);
    } catch { showNotif('error', 'Refresh failed'); }
    finally { setLoading(false); }
  }, [showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    refreshRef.current = setInterval(fetchData, 15000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchData]);

  const handleEntry = async (licensePlate, durationHours) => {
    if (!selectedSpot) return;
    try {
      await mockApi.checkIn(licensePlate, selectedSpot.id, durationHours, user.id);
      await fetchData(); setSelectedSpot(null);
      showNotif('success', `✅ Spot ${selectedSpot.spot_number} booked for ${durationHours}h`);
    } catch (err) { showNotif('error', err.message); }
  };

  const handleExit = async () => {
    if (!selectedSpot) return;
    const session = sessions.find(s => s.spot_number === selectedSpot.spot_number && s.duration_minutes === 0);
    if (!session) { showNotif('error', 'No active session'); return; }
    try {
      const r = await mockApi.checkOut(session.license_plate);
      await fetchData(); setSelectedSpot(null);
      showNotif('success', `✅ Checked out! $${r.data.total_amount}`);
    } catch (err) { showNotif('error', err.message); }
  };

  const handleExtend = async (extraHours) => {
    const target = extendSpot || selectedSpot;
    if (!target) return;
    try {
      await mockApi.extendBooking(target.id, extraHours);
      await fetchData();
      const updated = mockApi.getSpots().find(s => s.id === target.id);
      if (updated) { if (extendSpot) setExtendSpot(updated); if (selectedSpot) setSelectedSpot(updated); }
      showNotif('success', `⏱ Extended by ${extraHours}h!`);
    } catch (err) { showNotif('error', err.message); }
  };

  const activeSessions = sessions.filter(s => s.duration_minutes === 0);
  const criticalCount = spots.filter(s => s.booking && !s.booking.expired && new Date(s.booking.endTime).getTime() - Date.now() < 5 * 60 * 1000).length;
  const warningCount = spots.filter(s => s.booking && !s.booking.expired && new Date(s.booking.endTime).getTime() - Date.now() < 15 * 60 * 1000).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div><p className="mt-4 text-slate-600">Loading staff panel…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Toast notif={notif} />

      {/* Header */}
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M8 4v16M16 4v16M2 12h20" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">SmartPark AI</h1>
              <p className="text-xs text-white/60 -mt-0.5">Staff Operations Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && <span className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-full font-bold animate-pulse">🔴 {criticalCount} CRITICAL</span>}
            {warningCount > criticalCount && <span className="text-xs bg-white/20 text-white px-3 py-1.5 rounded-full font-medium">⚠ {warningCount} expiring</span>}
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
              <div className="h-8 w-8 rounded-full bg-amber-300 text-amber-900 flex items-center justify-center text-sm font-bold">{user.full_name[0]}</div>
              <div>
                <p className="text-sm font-semibold">{user.full_name}</p>
                <p className="text-xs text-white/60">Staff</p>
              </div>
            </div>
            <button onClick={onLogout} className="px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors">Logout</button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <div className="flex gap-6 text-sm">
            {[
              { label: 'Total', value: spots.length, color: 'text-white' },
              { label: 'Free', value: spots.filter(s => !s.is_occupied && !s.is_reserved).length, color: 'text-green-200' },
              { label: 'Occupied', value: spots.filter(s => s.is_occupied).length, color: 'text-red-200' },
              { label: 'Active Sessions', value: activeSessions.length, color: 'text-amber-200' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 pb-2">
            {[
              { id: 'parking', label: 'Parking Map', icon: '🗺️' },
              { id: 'bookings', label: `Active Bookings (${activeSessions.length})`, icon: '🕐' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-white text-amber-700 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Parking Map ── */}
        {activeTab === 'parking' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-2xl font-bold text-slate-900">Parking Map</h2><p className="text-slate-500 text-sm">Click any spot to check-in, check-out, or extend</p></div>
              <button onClick={fetchData} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center gap-2">🔄 Refresh</button>
            </div>

            {(criticalCount > 0 || warningCount > 0) && (
              <div className="space-y-2">
                {criticalCount > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl animate-pulse">🚨</span>
                    <div className="flex-1"><p className="font-bold text-red-800">{criticalCount} spot{criticalCount > 1 ? 's' : ''} expiring in under 5 minutes!</p></div>
                    <button onClick={() => setActiveTab('bookings')} className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700">Extend →</button>
                  </div>
                )}
                {warningCount > criticalCount && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <p className="text-amber-800 font-semibold text-sm">{warningCount} expiring within 15 minutes</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {zones.map(zone => (
                <div key={zone.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div><h3 className="font-bold text-slate-900 text-lg">Zone {zone.name}</h3><p className="text-xs text-slate-500">{zone.available_spots}/{zone.total_spots} free</p></div>
                    <span className="text-sm font-bold text-slate-700">{Math.round((zone.occupied_spots / zone.total_spots) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${(zone.occupied_spots / zone.total_spots) * 100}%` }} />
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

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-4 text-xs">
              {[
                { color: 'bg-green-400', label: 'Available' },
                { color: 'bg-red-500', label: 'Occupied' },
                { color: 'bg-amber-500', label: 'Expiring <15m' },
                { color: 'bg-red-600 animate-pulse', label: 'Critical <5m' },
                { color: 'bg-red-900', label: 'Expired' },
                { color: 'bg-emerald-200 border border-emerald-400', label: 'EV Free' },
              ].map(l => <span key={l.label} className="flex items-center gap-2 text-slate-600"><span className={`w-4 h-4 rounded ${l.color}`}></span>{l.label}</span>)}
            </div>
          </div>
        )}

        {/* ── Active Bookings ── */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div><h2 className="text-2xl font-bold text-slate-900">Active Bookings</h2><p className="text-slate-500 text-sm">{activeSessions.length} vehicles currently parked</p></div>
            {criticalCount > 0 && <div className="bg-red-600 rounded-2xl p-4 flex items-center gap-3 text-white animate-pulse"><span className="text-2xl">🚨</span><p className="font-bold">{criticalCount} CRITICAL — extend now!</p></div>}
            {warningCount > criticalCount && <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3"><span className="text-xl">⚠️</span><p className="text-amber-800 font-semibold">{warningCount} expiring within 15 minutes</p></div>}

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
                        <th className="text-left py-4 px-4">Time Left</th>
                        <th className="text-left py-4 px-4">Cost</th>
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
                <div className="text-5xl mb-4">🅿️</div>
                <p className="text-slate-600 font-medium">No active bookings</p>
                <button onClick={() => setActiveTab('parking')} className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600">Open Parking Map</button>
              </div>
            )}
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