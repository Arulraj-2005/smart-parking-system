// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const mockApi = {
  init() {
    if (localStorage.getItem('sp_initialized')) return;
    const zones = ['A', 'B', 'C', 'D'];
    const spots = [];
    let spotId = 1;
    zones.forEach((zone, zoneIndex) => {
      for (let i = 1; i <= 12; i++) {
        spots.push({
          id: spotId++,
          spot_number: `${zone}-${String(i).padStart(2, '0')}`,
          zone_id: zoneIndex + 1,
          zone_name: zone,
          spot_type: zone === 'D' ? 'electric' : i === 11 ? 'motorcycle' : i === 12 ? 'electric' : 'regular',
          is_occupied: false,
          is_reserved: false,
          hourly_rate: zone === 'D' ? 7 : 5,
          booking: null,
        });
      }
    });
    localStorage.setItem('sp_users', JSON.stringify([
      { id: 1, username: 'admin', email: 'admin@smartpark.com', full_name: 'System Administrator', role: 'admin', phone: '555-0000' },
      { id: 2, username: 'staff1', email: 'staff@smartpark.com', full_name: 'Parking Staff', role: 'staff', phone: '555-0001' },
    ]));
    localStorage.setItem('sp_spots', JSON.stringify(spots));
    localStorage.setItem('sp_sessions', JSON.stringify([]));
    localStorage.setItem('sp_vehicles', JSON.stringify([]));
    localStorage.setItem('sp_initialized', '1');
  },

  getSpots() { return JSON.parse(localStorage.getItem('sp_spots') || '[]'); },
  saveSpots(spots) { localStorage.setItem('sp_spots', JSON.stringify(spots)); },
  getSessions() { return JSON.parse(localStorage.getItem('sp_sessions') || '[]'); },
  saveSessions(s) { localStorage.setItem('sp_sessions', JSON.stringify(s)); },
  getVehicles() { return JSON.parse(localStorage.getItem('sp_vehicles') || '[]'); },
  saveVehicles(v) { localStorage.setItem('sp_vehicles', JSON.stringify(v)); },
  getUsers() { return JSON.parse(localStorage.getItem('sp_users') || '[]'); },
  saveUsers(u) { localStorage.setItem('sp_users', JSON.stringify(u)); },

  expireBookings() {
    const spots = this.getSpots();
    const now = new Date();
    let changed = false;
    spots.forEach(spot => {
      if (spot.booking && !spot.booking.expired) {
        const end = new Date(spot.booking.endTime);
        if (now > end) {
          spot.booking.expired = true;
          spot.is_occupied = false;
          spot.is_reserved = false;
          changed = true;
        }
      }
    });
    if (changed) this.saveSpots(spots);
    return spots;
  },

  async login(username, password) {
    await delay(300);
    const users = this.getUsers();
    let user = users.find(u => u.username === username || u.email === username);
    if (!user) throw new Error('Invalid username or password');
    if (password.length < 1) throw new Error('Password is required');
    return { success: true, data: { user, token: 'mock-jwt-' + user.id } };
  },

  async register(data) {
    await delay(300);
    const users = this.getUsers();
    if (users.find(u => u.username === data.username))
      throw new Error('Username already exists');
    if (users.find(u => u.email === data.email))
      throw new Error('Email already registered');
    if (!data.password || data.password.length < 6)
      throw new Error('Password must be at least 6 characters');
    const newUser = {
      id: users.length + 1,
      username: data.username,
      email: data.email,
      full_name: data.full_name,
      role: 'customer',
      phone: data.phone || '',
    };
    users.push(newUser);
    this.saveUsers(users);
    return { success: true, data: { user: newUser, token: 'mock-jwt-' + newUser.id } };
  },

  async getSpotList() {
    await delay(150);
    return { success: true, data: { spots: this.expireBookings() } };
  },

  async getZones() {
    await delay(150);
    const spots = this.expireBookings();
    const zones = spots.reduce((acc, spot) => {
      let z = acc.find(x => x.id === spot.zone_id);
      if (!z) { 
        z = { id: spot.zone_id, name: spot.zone_name, description: `Zone ${spot.zone_name}`, total_spots: 0, available_spots: 0, occupied_spots: 0, reserved_spots: 0 }; 
        acc.push(z); 
      }
      z.total_spots++;
      if (spot.is_occupied) z.occupied_spots++;
      else if (spot.is_reserved) z.reserved_spots++;
      else z.available_spots++;
      return acc;
    }, []);
    return { success: true, data: { zones } };
  },

  async getDashboard() {
    await delay(150);
    const spots = this.expireBookings();
    const sessions = this.getSessions();
    const totalSpots = spots.length;
    const occupiedSpots = spots.filter(s => s.is_occupied).length;
    const availableSpots = spots.filter(s => !s.is_occupied && !s.is_reserved).length;
    const reservedSpots = spots.filter(s => s.is_reserved).length;
    const completedRevenue = sessions.filter(s => s.duration_minutes > 0 && s.total_amount)
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const activeRevenue = sessions.filter(s => s.duration_minutes === 0)
      .reduce((sum, s) => {
        const mins = (new Date().getTime() - new Date(s.entry_time).getTime()) / 60000;
        return sum + (mins / 60) * 5;
      }, 0);
    return {
      success: true,
      data: {
        stats: {
          totalSpots, occupiedSpots, availableSpots, reservedSpots,
          todayRevenue: Math.round((completedRevenue + activeRevenue) * 100) / 100,
          todayVehicles: sessions.length,
          occupancyRate: totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0,
        }
      }
    };
  },

  async getActiveSessions() {
    await delay(150);
    const sessions = this.getSessions();
    return { success: true, data: { sessions: sessions.filter(s => s.duration_minutes === 0) } };
  },

  async getAllSessions() {
    await delay(150);
    return { success: true, data: { sessions: this.getSessions() } };
  },

  async getUserSessions(userId) {
    await delay(150);
    const sessions = this.getSessions().filter(s => s.bookedByUserId === userId);
    return { success: true, data: { sessions } };
  },

  async checkIn(licensePlate, spotId, durationHours, userId) {
    await delay(300);
    const spots = this.expireBookings();
    const sessions = this.getSessions();
    const vehicles = this.getVehicles();
    const spot = spots.find(s => s.id === spotId);
    if (!spot) throw new Error('Spot not found');
    if (spot.is_occupied) throw new Error('Spot is already occupied');
    let vehicle = vehicles.find(v => v.license_plate === licensePlate);
    if (!vehicle) {
      vehicle = { id: vehicles.length + 1, license_plate: licensePlate, vehicle_type: 'car' };
      vehicles.push(vehicle);
      this.saveVehicles(vehicles);
    }
    const now = new Date();
    const endTime = new Date(now.getTime() + durationHours * 3600 * 1000);
    const booking = {
      sessionId: sessions.length + 1,
      spotId,
      spotNumber: spot.spot_number,
      zoneName: spot.zone_name,
      licensePlate,
      vehicleType: vehicle.vehicle_type,
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      durationHours,
      hourlyRate: spot.hourly_rate,
      expired: false,
      extensions: [],
      totalExtendedHours: 0,
      bookedByUserId: userId,
    };
    const newSession = {
      id: sessions.length + 1,
      vehicle_id: vehicle.id,
      spot_id: spotId,
      license_plate: licensePlate,
      vehicle_type: vehicle.vehicle_type,
      spot_number: spot.spot_number,
      zone_name: spot.zone_name,
      entry_time: now.toISOString(),
      end_time: endTime.toISOString(),
      duration_hours: durationHours,
      duration_minutes: 0,
      extensions: [],
      total_extended_hours: 0,
      bookedByUserId: userId,
    };
    sessions.push(newSession);
    spot.is_occupied = true;
    spot.booking = booking;
    this.saveSessions(sessions);
    this.saveSpots(spots);
    return { success: true, data: { sessionId: newSession.id, entry_time: now.toISOString(), end_time: endTime.toISOString() } };
  },

  async checkOut(licensePlate) {
    await delay(300);
    const spots = this.getSpots();
    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.license_plate === licensePlate && s.duration_minutes === 0);
    if (sessionIndex === -1) throw new Error('No active session found');
    const session = sessions[sessionIndex];
    const spot = spots.find(s => s.id === session.spot_id);
    const entryTime = new Date(session.entry_time);
    const now = new Date();
    const durationMinutes = Math.max(1, Math.floor((now.getTime() - entryTime.getTime()) / 60000));
    const durationHours = Math.ceil(durationMinutes / 60);
    const totalAmount = durationHours * (spot?.hourly_rate || 5);
    session.duration_minutes = durationMinutes;
    session.duration_hours = durationHours;
    session.total_amount = totalAmount;
    if (spot) {
      spot.is_occupied = false;
      spot.is_reserved = false;
      spot.booking = null;
      this.saveSpots(spots);
    }
    this.saveSessions(sessions);
    return { success: true, data: { duration_minutes: durationMinutes, duration_hours: durationHours, total_amount: totalAmount } };
  },

  async extendBooking(spotId, extraHours) {
    await delay(300);
    const spots = this.getSpots();
    const sessions = this.getSessions();
    const spot = spots.find(s => s.id === spotId);
    if (!spot || !spot.booking) throw new Error('No active booking for this spot');
    const prevEnd = new Date(spot.booking.endTime);
    const newEnd = new Date(prevEnd.getTime() + extraHours * 3600 * 1000);
    const now = new Date().toISOString();
    const record = { addedHours: extraHours, extendedAt: now, newEndTime: newEnd.toISOString() };
    spot.booking.endTime = newEnd.toISOString();
    spot.booking.expired = false;
    spot.booking.durationHours += extraHours;
    spot.booking.totalExtendedHours = (spot.booking.totalExtendedHours || 0) + extraHours;
    spot.booking.extensions = [...(spot.booking.extensions || []), record];
    spot.is_occupied = true;
    const session = sessions.find(s => s.id === spot.booking.sessionId);
    if (session) {
      session.end_time = newEnd.toISOString();
      session.duration_hours += extraHours;
      session.total_extended_hours = (session.total_extended_hours || 0) + extraHours;
      session.extensions = [...(session.extensions || []), record];
    }
    this.saveSpots(spots);
    this.saveSessions(sessions);
    return { success: true, data: { new_end_time: newEnd.toISOString(), extension: record } };
  },

  async deleteUser(userId) {
    await delay(200);
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);
    return { success: true };
  },

  async updateUserRole(userId, role) {
    await delay(200);
    const users = this.getUsers();
    const u = users.find(x => x.id === userId);
    if (u) u.role = role;
    this.saveUsers(users);
    return { success: true };
  },
};

mockApi.init();