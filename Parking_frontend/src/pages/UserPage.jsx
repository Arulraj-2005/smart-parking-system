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

export default function UserPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('map');
  const [spots, setSpots] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const refreshRef = useRef(null);

  const showNotif = useCallback((type, message) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [spotsData, zonesData] = await Promise.all([
        apiRequest('/parking/spots'),
        apiRequest('/parking/zones'),
      ]);
      setSpots(spotsData.data?.spots || []);
      setZones(zonesData.data?.zones || []);
    } catch (err) {
      showNotif('error', 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    refreshRef.current = setInterval(fetchData, 15000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-slate-600">Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Toast notif={notif} />

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
          <button onClick={onLogout} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Find & Book a Spot</h2>
              <p className="text-slate-500 text-sm">Click any green spot to start a booking</p>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {zones.map(zone => {
                const zoneSpots = spots.filter(s => s.zone_id === zone.id);
                const availableSpots = zoneSpots.filter(s => !s.is_occupied && !s.is_reserved).length;
                return (
                  <div key={zone.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">Zone {zone.name}</h3>
                        <p className="text-xs text-slate-500">{availableSpots} of {zone.total_spots} free</p>
                      </div>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${availableSpots === 0 ? 'bg-red-100 text-red-700' : availableSpots < 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {availableSpots === 0 ? 'Full' : availableSpots < 3 ? 'Almost Full' : 'Available'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {zoneSpots.map(spot => (
                        <button key={spot.id}
                          onClick={() => !spot.is_occupied && !spot.is_reserved ? setSelectedSpot(spot) : null}
                          disabled={spot.is_occupied || spot.is_reserved}
                          className={`aspect-square rounded-lg ${getSpotColor(spot)} transition-all duration-200 flex flex-col items-center justify-center shadow-sm ${!spot.is_occupied ? 'hover:scale-105' : 'cursor-not-allowed opacity-80'} relative`}>
                          <span className="text-[8px] font-bold text-white leading-tight drop-shadow">{spot.spot_number}</span>
                          {spot.spot_type === 'electric' && !spot.is_occupied && (
                            <svg className="w-2.5 h-2.5 text-emerald-600 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
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
      </main>

      {selectedSpot && !selectedSpot.is_occupied && (
        <SpotModal spot={selectedSpot} sessions={[]} onClose={() => setSelectedSpot(null)}
          onEntry={async (plate, duration) => {
            try {
              await apiRequest('/parking/book', {
                method: 'POST',
                body: JSON.stringify({ spotId: selectedSpot.id, licensePlate: plate, durationHours: duration })
              });
              await fetchData();
              setSelectedSpot(null);
              showNotif('success', `Spot ${selectedSpot.spot_number} booked!`);
            } catch (err) {
              showNotif('error', err.message);
            }
          }}
          onExit={async () => {}}
          onOpenExtend={() => {}}
          userView={true} />
      )}
    </div>
  );
}