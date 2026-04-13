const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const fs = require('fs');
const path = require('path');
const rideStatusPath = path.join(__dirname, '../data/ride-status.json');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const stmt = getDB().prepare('SELECT * FROM sessions WHERE token = ?');
  const session = stmt.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const userStmt = getDB().prepare('SELECT * FROM users WHERE id = ?');
  req.user = userStmt.get(session.userId);
  next();
};

router.post('/request', authenticate, async (req, res) => {
  try {
    const { pickup, dropoff, pickupLat, pickupLon, dropoffLat, dropoffLon, distance, phone } = req.body;
    
    if (!pickup || !dropoff || pickupLat == null || pickupLon == null || dropoffLat == null || dropoffLon == null || !distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const fare = Math.round(parseFloat(distance) * 10);
    
    // Save to DB
    const stmt = getDB().prepare(`
      INSERT INTO rides (passenger_id, passenger_name, passenger_phone, pickup, dropoff, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, distance, fare, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'searching')
    `);
    const result = stmt.run(req.user.id, req.user.name, phone, pickup, dropoff, pickupLat, pickupLon, dropoffLat, dropoffLon, distance, fare);
    
    // Save to JSON
    const rideStatus = JSON.parse(fs.readFileSync(rideStatusPath, 'utf8'));
    rideStatus.rides.push({
      id: result.lastInsertRowid,
      passengerId: req.user.id,
      passengerName: req.user.name,
      phone,
      pickup,
      dropoff,
      status: 'searching',
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(rideStatusPath, JSON.stringify(rideStatus, null, 2));
    
    const io = req.app.get('io');
    io.to('riders').emit('new-ride', {
      id: result.lastInsertRowid,
      pickup,
      dropoff,
      distance,
      fare,
      passengerName: req.user.name,
      phone
    });
    
    console.log(`New ride #${result.lastInsertRowid} created`);
    
    res.json({ 
      status: 'searching', 
      rideId: result.lastInsertRowid,
      fare 
    });
  } catch (e) {
    console.error('Ride request error:', e.message);
    res.status(500).json({ error: `Ride creation failed: ${e.message}` });
  }
});

router.get('/status', authenticate, (req, res) => {
  try {
    const stmt = getDB().prepare(`
      SELECT * FROM ride_requests WHERE passenger_id = ? ORDER BY created_at DESC LIMIT 1
    `);
    const request = stmt.get(req.user.id);
    
    if (!request) {
      return res.json({ status: 'none' });
    }
    
    res.json({
      status: request.status,
      riderId: request.rider_id,
      requestId: request.id
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.get('/dashboard', authenticate, (req, res) => {
  try {
    const historyStmt = getDB().prepare(`
      SELECT * FROM completed_rides WHERE rider_id = ? ORDER BY completed_at DESC
    `);
    const history = historyStmt.all(req.user.id);
    
    const requestsStmt = getDB().prepare(`
      SELECT * FROM ride_requests WHERE status = 'pending' ORDER BY created_at DESC
    `);
    const requests = requestsStmt.all();
    
    res.json({
      history: history.map(r => ({
        id: r.id,
        pickup: r.pickup,
        dropoff: r.dropoff,
        distance: r.distance,
        fare: r.fare,
        date: new Date(r.completed_at).toLocaleDateString()
      })),
      requests: requests.map(r => ({
        id: r.id,
        pickup: r.pickup,
        dropoff: r.dropoff,
        distance: r.distance,
        fare: r.fare
      }))
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

router.post('/accept', authenticate, (req, res) => {
  try {
    const { requestId } = req.body;
    
    const getRequest = getDB().prepare('SELECT * FROM ride_requests WHERE id = ?');
    const request = getRequest.get(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const updateStmt = getDB().prepare(`
      UPDATE ride_requests SET rider_id = ?, status = 'accepted' WHERE id = ?
    `);
    updateStmt.run(req.user.id, requestId);
    
    const completedStmt = getDB().prepare(`
      INSERT INTO completed_rides (rider_id, passenger_id, pickup, dropoff, distance, fare)
      SELECT ?, passenger_id, pickup, dropoff, distance, fare FROM ride_requests WHERE id = ?
    `);
    completedStmt.run(req.user.id, requestId);
    
    const io = req.app.get('io');
    io.emit('ride-accepted', {
      requestId,
      riderId: req.user.id,
      riderName: req.user.name
    });
    
    res.json({ status: 'accepted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

module.exports = router;