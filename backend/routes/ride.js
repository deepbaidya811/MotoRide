const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const rideStatusPath = path.join(__dirname, '../data/ride-status.json');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    const userStmt = getDB().prepare('SELECT * FROM users WHERE id = ?');
    req.user = userStmt.get(decoded.id);
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/request', authenticate, async (req, res) => {
  try {
    const { pickup, dropoff, pickupLat, pickupLon, dropoffLat, dropoffLon, distance, phone } = req.body;
    console.log('Ride request:', { userId: req.user.id, name: req.user.name, phone: req.user.phone });
    console.log('User from DB:', req.user);
    
    if (!req.user.name || !req.user.phone) {
      return res.status(400).json({ error: 'Please update your profile with name and phone before booking' });
    }
    
    if (!pickup || !dropoff || pickupLat == null || pickupLon == null || dropoffLat == null || dropoffLon == null || !distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const fare = Math.round(parseFloat(distance) * 10);
    
    // Save to DB
    const stmt = getDB().prepare(`
      INSERT INTO rides (passenger_id, passenger_name, passenger_phone, pickup, dropoff, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, distance, fare, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'searching')
    `);
    const result = stmt.run(req.user.id, req.user.name, req.user.phone, pickup, dropoff, pickupLat, pickupLon, dropoffLat, dropoffLon, distance, fare);
    
    // Save to JSON
    try {
      const rideStatus = JSON.parse(fs.readFileSync(rideStatusPath, 'utf8'));
      rideStatus.rides.push({
        id: result.lastInsertRowid,
        passengerId: req.user.id,
        passengerName: req.user.name,
        phone: req.user.phone,
        pickup,
        dropoff,
        status: 'searching',
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(rideStatusPath, JSON.stringify(rideStatus, null, 2));
      console.log('Ride saved to JSON');
    } catch (jsonErr) {
      console.error('Error saving to JSON:', jsonErr.message);
    }
    
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
      SELECT * FROM rides WHERE status = 'searching' ORDER BY created_at DESC
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
        passengerName: r.passenger_name,
        passengerPhone: r.passenger_phone,
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

router.post('/cancel', authenticate, (req, res) => {
  try {
    const { rideId } = req.body;
    
    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID required' });
    }
    
    getDB().prepare('DELETE FROM rides WHERE id = ? AND passenger_id = ?').run(rideId, req.user.id);
    
    const rideStatus = JSON.parse(fs.readFileSync(rideStatusPath, 'utf8'));
    rideStatus.rides = rideStatus.rides.filter(r => r.id !== rideId);
    fs.writeFileSync(rideStatusPath, JSON.stringify(rideStatus, null, 2));
    
    const io = req.app.get('io');
    io.to('riders').emit('ride-cancelled', { rideId });
    
    res.json({ success: true, message: 'Ride cancelled' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
});

router.post('/accept', authenticate, (req, res) => {
  try {
    const { rideId } = req.body;
    
    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID required' });
    }
    
    const ride = getDB().prepare('SELECT * FROM rides WHERE id = ? AND status = ?').get(rideId, 'searching');
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found or already accepted' });
    }
    
    getDB().prepare('UPDATE rides SET rider_id = ?, status = ? WHERE id = ?').run(req.user.id, 'accepted', rideId);
    
    const io = req.app.get('io');
    io.to('riders').emit('ride-accepted', { rideId, riderId: req.user.id });
    io.to('passenger-' + ride.passenger_id).emit('ride-accepted', {
      rideId,
      riderId: req.user.id,
      riderName: req.user.name,
      riderPhone: req.user.phone
    });
    
    res.json({ success: true, message: 'Ride accepted', rideId });
  } catch (e) {
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

router.get('/available', authenticate, (req, res) => {
  try {
    const stmt = getDB().prepare('SELECT * FROM rides WHERE status = ? ORDER BY created_at DESC');
    const rides = stmt.all('searching');
    
    res.json({ 
      rides: rides.map(r => ({
        id: r.id,
        passengerName: r.passenger_name,
        passengerPhone: r.passenger_phone,
        pickup: r.pickup,
        dropoff: r.dropoff,
        distance: r.distance,
        fare: r.fare
      }))
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get rides' });
  }
});

module.exports = router;