import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://smart-parking-api-zbno.onrender.com/api';

// Helper for API calls
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Countdown Hook ───────────────────────────────────────────────────────────
export function useCountdown(endTime) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endTime) return;
    const tick = () => setRemaining(Math.max(0, new Date(endTime).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const expired = remaining === 0 && endTime !== null;
  const critical = remaining > 0 && remaining < 5 * 60 * 1000;
  const warning = remaining > 0 && remaining < 15 * 60 * 1000;
  return { hours, minutes, seconds, expired, critical, warning, totalMs: remaining };
}

// ─── Countdown Badge (on spot tile) ───────────────────────────────────────────
export function CountdownBadge({ endTime }) {
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(endTime);
  if (expired) return <span className="text-[8px] font-bold text-red-100 bg-red-700 rounded px-1">EXP</span>;
  return (
    <span className={`text-[8px] font-bold rounded px-1 ${critical ? 'text-white bg-red-600 animate-pulse' : warning ? 'text-amber-900 bg-amber-300 animate-pulse' : 'text-white/90 bg-black/25'}`}>
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

// ─── Spot Color Util ───────────────────────────────────────────────────────────
export function getSpotColor(spot) {
  if (spot.is_occupied) {
    if (spot.booking) {
      const remaining = new Date(spot.booking.endTime).getTime() - Date.now();
      if (remaining <= 0) return 'bg-red-900 ring-2 ring-red-400';
      if (remaining < 5 * 60 * 1000) return 'bg-red-600 ring-2 ring-red-300 animate-pulse';
      if (remaining < 15 * 60 * 1000) return 'bg-amber-500 ring-2 ring-amber-300';
    }
    return spot.spot_type === 'electric' ? 'bg-emerald-600' : 'bg-red-500';
  }
  if (spot.is_reserved) return 'bg-orange-400 hover:bg-orange-500';
  if (spot.spot_type === 'electric') return 'bg-emerald-200 hover:bg-emerald-300 cursor-pointer';
  if (spot.spot_type === 'motorcycle') return 'bg-purple-200 hover:bg-purple-300 cursor-pointer';
  return 'bg-green-400 hover:bg-green-500 cursor-pointer';
}

// ─── Notification Toast ────────────────────────────────────────────────────────
export function Toast({ notif }) {
  if (!notif) return null;
  const icon = notif.type === 'success' ? '✓' : notif.type === 'warn' ? '!' : '✗';
  return (
    <div className={`fixed top-5 right-5 z-[100] px-6 py-3.5 rounded-2xl shadow-2xl text-white font-medium flex items-center gap-3 max-w-sm animate-bounce-in ${
      notif.type === 'success' ? 'bg-green-500' : notif.type === 'warn' ? 'bg-amber-500' : 'bg-red-500'
    }`}>
      <span className="text-xl">{icon}</span>
      {notif.message}
    </div>
  );
}

// ─── Extend Booking Modal ──────────────────────────────────────────────────────
export function ExtendModal({ spot, onClose, onExtend }) {
  // Safety check - prevent white screen if booking data is missing
  if (!spot || !spot.booking || !spot.booking.endTime) {
    console.warn('ExtendModal: Missing booking data', spot);
    return null;
  }
  
  const [extra, setExtra] = useState(1);
  const [busy, setBusy] = useState(false);
  
  const booking = spot.booking;
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(booking.endTime);
  const newEndTime = new Date(new Date(booking.endTime).getTime() + extra * 3600 * 1000);
  const additionalCost = extra * (spot.hourly_rate || 50);
  const totalDuration = (booking.durationHours || 1) * 3600 * 1000;
  const used = totalDuration - (new Date(booking.endTime).getTime() - Date.now());
  const usedPct = Math.min(100, Math.max(0, (used / totalDuration) * 100));
  
  const urgencyBg = expired ? 'from-red-700 to-red-900' : critical ? 'from-red-500 to-orange-600' : warning ? 'from-amber-500 to-orange-500' : 'from-blue-600 to-indigo-700';
  const urgencyLabel = expired ? 'BOOKING EXPIRED' : critical ? 'CRITICAL - Under 5 min!' : warning ? 'Expiring Soon' : 'Time Remaining';

  const doExtend = async () => {
    setBusy(true);
    await onExtend(extra);
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className={`bg-gradient-to-r ${urgencyBg} px-6 py-5`}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Extend Booking</p>
              <h2 className="text-white font-bold text-xl">Spot {spot.spot_number} · Zone {spot.zone_name}</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <p className="text-white/70 text-sm">{booking.licensePlate || 'N/A'} · ₹{spot.hourly_rate || 50}/hr</p>
        </div>

        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Countdown */}
          <div className={`rounded-xl border-2 p-4 text-center ${expired ? 'border-red-300 bg-red-50' : critical ? 'border-red-200 bg-red-50' : warning ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${expired ? 'text-red-600' : critical ? 'text-red-600' : warning ? 'text-amber-600' : 'text-blue-600'}`}>{urgencyLabel}</p>
            {expired ? <p className="text-3xl font-bold text-red-700">00:00:00</p> : (
              <p className={`text-4xl font-mono font-bold tracking-widest ${critical ? 'text-red-600 animate-pulse' : warning ? 'text-amber-600' : 'text-blue-700'}`}>
                {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
            )}
            <div className="mt-3 mb-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Start: {fmtTime(booking.startTime || booking.entry_time)}</span>
                <span>End: {fmtTime(booking.endTime)}</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${expired ? 'bg-red-500' : critical ? 'bg-red-400' : warning ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${usedPct}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1 text-right">{usedPct.toFixed(0)}% time used</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Quick Extend Options</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(h => (
                <button key={h} onClick={() => setExtra(h)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${extra === h ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-105' : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                  +{h}h
                </button>
              ))}
            </div>
          </div>

          {/* Stepper */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-medium text-slate-600 mb-3 text-center">Custom Duration</p>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setExtra(Math.max(1, extra - 1))} className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 text-slate-700 text-2xl hover:border-blue-400 flex items-center justify-center font-bold shadow-sm transition-all">−</button>
              <div className="text-center"><span className="text-4xl font-bold text-slate-900">{extra}</span><span className="text-lg text-slate-500 ml-1">hr{extra > 1 ? 's' : ''}</span></div>
              <button onClick={() => setExtra(Math.min(24, extra + 1))} className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 text-slate-700 text-2xl hover:border-blue-400 flex items-center justify-center font-bold shadow-sm transition-all">+</button>
            </div>
            <input type="range" min={1} max={24} value={extra} onChange={e => setExtra(Number(e.target.value))} className="w-full mt-3 accent-blue-600" />
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <h4 className="font-semibold text-slate-800 mb-3">Extension Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Adding</span><span className="font-bold">{extra}h</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Rate</span><span className="font-semibold">₹{spot.hourly_rate || 50}/hr</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Old end time</span><span className="line-through opacity-50">{fmtDateTime(booking.endTime)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">New end time</span><span className="font-bold text-green-700">{fmtDateTime(newEndTime.toISOString())}</span></div>
              <div className="border-t border-blue-200 pt-2 flex justify-between">
                <span className="font-bold">Additional Cost</span>
                <span className="font-bold text-blue-700 text-xl">₹{additionalCost}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={doExtend} disabled={busy}
              className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
              {busy ? 'Extending...' : `Extend by ${extra}h · ₹${additionalCost}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Spot Booking Modal ────────────────────────────────────────────────────────
export function SpotModal({ spot, sessions, onClose, onEntry, onExit, onOpenExtend, userView = false }) {
  const [plate, setPlate] = useState('');
  const [duration, setDuration] = useState(1);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('checkout');
  const session = sessions.find(s => s.spot_number === spot.spot_number && s.duration_minutes === 0);
  const booking = spot.booking;
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(booking?.endTime ?? null);
  const estimatedCost = duration * (spot.hourly_rate || 50);
  const actualCost = session ? Math.ceil((Date.now() - new Date(session.entry_time).getTime()) / 3600000) * (spot.hourly_rate || 50) : 0;
  const headerBg = spot.is_occupied ? (expired ? 'bg-red-800' : critical ? 'bg-red-600' : warning ? 'bg-amber-500' : 'bg-red-500') : 'bg-gradient-to-r from-blue-600 to-indigo-700';

  const doEntry = async () => { if (!plate) return; setBusy(true); await onEntry(plate.toUpperCase(), duration); setBusy(false); };
  const doExit = async () => { setBusy(true); await onExit(); setBusy(false); };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className={`px-6 py-4 flex items-center justify-between ${headerBg}`}>
          <div>
            <h3 className="text-white font-bold text-lg">Spot {spot.spot_number}</h3>
            <p className="text-white/80 text-sm">Zone {spot.zone_name} · {spot.spot_type} · ₹{spot.hourly_rate || 50}/hr</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {spot.is_occupied && booking ? (
            <>
              <div className={`rounded-xl p-4 text-center border-2 ${expired ? 'bg-red-50 border-red-300' : critical ? 'bg-red-50 border-red-200' : warning ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Time Remaining</p>
                {expired ? <p className="text-2xl font-bold text-red-700">EXPIRED</p> : (
                  <p className={`text-3xl font-mono font-bold ${critical ? 'text-red-600 animate-pulse' : warning ? 'text-amber-600' : 'text-slate-800'}`}>
                    {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </p>
                )}
                {critical && !expired && <p className="text-xs text-red-600 font-bold mt-1 animate-pulse">Under 5 minutes!</p>}
                {warning && !critical && <p className="text-xs text-amber-600 mt-1">Less than 15 minutes</p>}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div><span className="font-medium">Vehicle:</span> {booking.licensePlate || 'N/A'}</div>
                  <div><span className="font-medium">Booked:</span> {booking.durationHours || 1}h</div>
                  <div><span className="font-medium">Rate:</span> ₹{spot.hourly_rate || 50}/hr</div>
                  <div><span className="font-medium">Extended:</span> {booking.totalExtendedHours || 0}h</div>
                </div>
              </div>

              <div className="flex rounded-xl overflow-hidden border-2 border-slate-200">
                {!userView && (
                  <button onClick={() => setTab('checkout')} className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${tab === 'checkout' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    Check Out
                  </button>
                )}
                <button onClick={() => { setTab('extend'); onOpenExtend(); }} className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${tab === 'extend' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  Extend Time
                </button>
              </div>

              {tab === 'checkout' && !userView && (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Since</span><span className="font-medium">{fmtTime(session?.entry_time || booking.startTime)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-medium">{Math.max(1, Math.ceil((Date.now() - new Date(session?.entry_time || booking.startTime).getTime()) / 3600000))}h</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-semibold">Amount Due</span><span className="font-bold text-green-700 text-base">₹{actualCost}</span></div>
                  </div>
                  <button onClick={doExit} disabled={busy} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {busy ? 'Processing...' : 'Confirm Check-Out'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">License Plate</label>
                <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="e.g. TN01AB1234"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest font-mono text-lg text-center" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[1, 2, 3, 4].map(h => (
                    <button key={h} onClick={() => setDuration(h)} className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${duration === h ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:border-blue-300'}`}>{h}h</button>
                  ))}
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <button onClick={() => setDuration(Math.max(1, duration - 1))} className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white text-slate-700 hover:border-blue-400 flex items-center justify-center text-xl font-bold shadow-sm">−</button>
                  <span className="flex-1 text-center text-3xl font-bold text-slate-900">{duration}<span className="text-lg text-slate-400 ml-1">hr{duration > 1 ? 's' : ''}</span></span>
                  <button onClick={() => setDuration(Math.min(24, duration + 1))} className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white text-slate-700 hover:border-blue-400 flex items-center justify-center text-xl font-bold shadow-sm">+</button>
                </div>
                <input type="range" min={1} max={24} value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full mt-2 accent-blue-600" />
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 space-y-2 border border-blue-100">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Duration</span><span className="font-semibold">{duration}h</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Rate</span><span className="font-semibold">₹{spot.hourly_rate || 50}/hr</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Ends at</span><span className="font-semibold">{new Date(Date.now() + duration * 3600 * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div className="border-t border-blue-200 pt-2 flex justify-between"><span className="font-bold text-slate-700">Estimated Total</span><span className="font-bold text-blue-700 text-xl">₹{estimatedCost}</span></div>
              </div>
              <button onClick={doEntry} disabled={!plate || busy}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? 'Booking...' : `Book for ${duration}h · ₹${estimatedCost}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Booking Timer Row ─────────────────────────────────────────────────────────
export function BookingTimerRow({ session, spots, onExtend, showExtend = true }) {
  const spot = spots.find(s => s.spot_number === session.spot_number);
  const { hours, minutes, seconds, expired, critical, warning } = useCountdown(session.end_time);
  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50 ${critical && !expired ? 'bg-red-50' : warning && !expired ? 'bg-amber-50' : ''}`}>
      <td className="py-3 px-4 text-sm font-mono font-bold text-slate-900">{session.license_plate}</td>
      <td className="py-3 px-4 text-sm text-slate-600">{session.spot_number}</td>
      <td className="py-3 px-4 text-sm text-slate-600">Zone {session.zone_name}</td>
      <td className="py-3 px-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium w-fit">{session.duration_hours}h booked</span>
          {(session.total_extended_hours || 0) > 0 && <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 font-medium w-fit">+{session.total_extended_hours}h ext.</span>}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-slate-600">{new Date(session.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
      <td className="py-3 px-4 text-sm font-medium">
        {expired ? <span className="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded-full">EXPIRED</span> : (
          <span className={`font-mono font-bold ${critical ? 'text-red-600 animate-pulse' : warning ? 'text-amber-600' : 'text-slate-700'}`}>
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-slate-600">₹{(spot?.hourly_rate || 50) * session.duration_hours}</td>
      {showExtend && (
        <td className="py-3 px-4">
          <button onClick={() => spot && onExtend(spot)} disabled={!spot || !spot.booking}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 shadow-sm">
            Extend
          </button>
        </td>
      )}
    </tr>
  );
}