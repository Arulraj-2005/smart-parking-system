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

// Active Booking Card Component
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
          </div>
          <p className="text-sm text-slate-500 font-mono">{session.license_plate}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Rate</p>
          <p className="font-bold text-slate-900">${spot?.hourly_rate || 5}/hr</p>
        </div>
      </div>

      <div className={`rounded-xl p-3 text-center mb-4 ${expired ? 'bg-red-100' : critical ? 'bg-red-100' : warning ? 'bg-amber-100' : 'bg-slate-50'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${expired ? 'text-red-700' : critical ? 'text-red-600' : warning ? 'text-amber-600' : 'text-slate-500'}`}>
          {expired ? 'EXPIRED' : critical ? 'CRITICAL - Under 5 min!' : warning ? 'Expiring Soon' : 'Time Remaining'}
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
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onExtend}
          className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all">
          Extend Time
        </button>
        <button onClick={onCheckout}
          className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">
          Check Out
        </button>
      </div>
    </div>
  );
}

// Checkout Modal
function CheckoutModal({ session, spot, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const actualHours = Math.max(1, Math.ceil((Date.now() - new Date(session.entry_time).getTime()) / 3600000));
  const cost = actualHours * (spot?.hourly_rate || 5);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
          <h3 className="text-white font-bold text-lg">Confirm Check-Out</h3>
          <p className="text-white/70 text-sm">Spot {session.spot_number} · {session.license_plate}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Entry time</span><span className="font-medium">{new Date(session.entry_time).toLocaleTimeString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-medium">{actualHours}h</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rate</span><span className="font-medium">${spot?.hourly_rate || 5}/hr</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-bold text-slate-700">Total Amount Due</span>
              <span className="font-bold text-green-700 text-xl">${cost}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold">Cancel</button>
            <button onClick={onConfirm} disabled={busy} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold">
              {busy ? 'Processing...' : `Pay $${cost} & Exit`}
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
      console.log('Fetching data...');
      
      const [spotsData, zonesData, sessionsData] = await Promise.all([
        apiRequest('/parking/spots'),
        apiRequest('/parking/zones'),
        apiRequest('/parking/sessions/my'),
      ]);
      
      console.log('Sessions API response:', sessionsData);
      
      setSpots(spotsData.data?.spots || []);
      setZones(zonesData.data?.zones || []);
      
      const allSessions = sessionsData.sessions || sessionsData.data?.sessions || [];
      
      console.log('All sessions count:', allSessions.length);
      
      const active = allSessions.filter(s => !s.end_time || new Date(s.end_time) > new Date());
      const completed = allSessions.filter(s => s.end_time && new Date(s.end_time) <= new Date());
      
      setActiveSessions(active);
      setCompletedSessions(completed);
      
      console.log('Active sessions:', active.length);
    } catch (err) {
      console.error('Fetch error:', err);
      showNotif('error', 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    refreshRef.current = setInterval(fetchData, 10000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchData]);

  const handleBooking = async (licensePlate, durationHours) => {
    if (!selectedSpot) return;
    try {
      console.log('Booking spot:', selectedSpot.id, licensePlate, durationHours);
      
      const result = await apiRequest('/parking/book', {
        method: 'POST',
        body: JSON.stringify({ 
          spotId: selectedSpot.id, 
          licensePlate, 
          durationHours 
        })
      });
      
      console.log('Booking result:', result);
      
      await fetchData();
      setSelectedSpot(null);
      showNotif('success', `Spot ${selectedSpot.spot_number} booked for ${durationHours}h!`);
      setActiveTab('mybookings');
    } catch (err) {
      console.error('Booking error:', err);
      showNotif('error', err.message);
    }
  };

  const handleCheckout = async () => {
    if (!checkoutSession) return;
    try {
      console.log('Checking out session:', checkoutSession.id);
      
      await apiRequest('/parking/checkout', {
        method: 'POST',
        body: JSON.stringify({ sessionId: checkoutSession.id })
      });
      
      await fetchData();
      setCheckoutSession(null);
      showNotif('success', 'Checked out successfully!');
      setActiveTab('history');
    } catch (err) {
      console.error('Checkout error:', err);
      showNotif('error', err.message);
    }
  };

  const handleExtend = async (extraHours) => {
    if (!extendSpot) return;
    try {
      console.log('Extending spot:', extendSpot.id, extraHours);
      
      await apiRequest('/parking/extend', {
        method: 'POST',
        body: JSON.stringify({ spotId: extendSpot.id, extraHours })
      });
      
      await fetchData();
      showNotif('success', `Extended by ${extraHours} hours!`);
      setExtendSpot(null);
    } catch (err) {
      console.error('Extend error:', err);
      showNotif('error', err.message);
    }
  };

  const availableSpots = spots.filter(s => !s.is_occupied && !s.is_reserved).length;
  const occupiedSpots = spots.filter(s => s.is_occupied).length;
  const evFreeSpots = spots.filter(s => s.spot_type === 'electric' && !s.is_occupied).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Toast notif={notif} />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M8 4v16M16 4v16M2 12h20" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">SmartPark</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Customer Portal</p>
            </div>
          </div>
          <button onClick={onLogout} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            Logout
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 py-1">
            {[
              { id: 'map', label: 'Book a Spot', icon: '🗺️' },
              { id: 'mybookings', label: `My Bookings (${activeSessions.length})`, icon: '🅿️' },
              { id: 'history', label: 'History', icon: '📋' },
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Book a Spot Tab */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Find & Book a Spot</h2>
              <p className="text-slate-500 text-sm">Click any green spot to start a booking</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-3xl font-bold text-green-600">{availableSpots}</p>
                <p className="text-xs text-slate-500 mt-1">Available</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-3xl font-bold text-red-500">{occupiedSpots}</p>
                <p className="text-xs text-slate-500 mt-1">Occupied</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-3xl font-bold text-emerald-600">{evFreeSpots}</p>
                <p className="text-xs text-slate-500 mt-1">EV Free</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {zones.map(zone => {
                const zoneSpots = spots.filter(s => s.zone_id === zone.id);
                const available = zoneSpots.filter(s => !s.is_occupied && !s.is_reserved).length;
                return (
                  <div key={zone.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">Zone {zone.name}</h3>
                        <p className="text-xs text-slate-500">{available} of {zone.total_spots} free</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {zoneSpots.map(spot => (
                        <button
                          key={spot.id}
                          onClick={() => !spot.is_occupied && !spot.is_reserved ? setSelectedSpot(spot) : null}
                          disabled={spot.is_occupied || spot.is_reserved}
                          className={`aspect-square rounded-lg ${getSpotColor(spot)} transition-all duration-200 flex flex-col items-center justify-center shadow-sm ${
                            !spot.is_occupied ? 'hover:scale-105' : 'cursor-not-allowed opacity-80'
                          } relative`}
                        >
                          <span className="text-[8px] font-bold text-white leading-tight drop-shadow">{spot.spot_number}</span>
                          {spot.is_occupied && spot.booking && !spot.booking.expired && (
                            <CountdownBadge endTime={spot.booking.endTime} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My Bookings Tab */}
        {activeTab === 'mybookings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Active Bookings</h2>
              <p className="text-slate-500 text-sm">{activeSessions.length} active booking(s)</p>
            </div>
            {activeSessions.length > 0 ? (
              <div className="space-y-4">
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
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-6xl mb-4">🅿️</div>
                <h3 className="text-slate-700 font-semibold text-lg mb-2">No Active Bookings</h3>
                <button 
                  onClick={() => setActiveTab('map')} 
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold"
                >
                  Find a Spot
                </button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Parking History</h2>
              <p className="text-slate-500 text-sm">{completedSessions.length} completed session(s)</p>
            </div>
            {completedSessions.length > 0 ? (
              <div className="space-y-3">
                {completedSessions.map(session => {
                  const amount = typeof session.total_amount === 'number' 
                    ? session.total_amount.toFixed(2) 
                    : (session.total_amount || '0');
                  
                  return (
                    <div key={session.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
                        ✓
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Spot {session.spot_number}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">Zone {session.zone_name}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {fmtDateTime(session.entry_time)} · {session.duration_hours}h parked
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">${amount}</p>
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

      {/* Modals */}
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
    </div>
  );
}