require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const BEDS24_TOKEN = process.env.BEDS24_TOKEN;
const PROPERTY_ID = process.env.PROPERTY_ID || 'YOUR_PROPERTY_ID';
const BEDS24_API = 'https://beds24.com/api/v2';

async function beds24Request(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${BEDS24_API}${endpoint}`,
      headers: {
        'token': BEDS24_TOKEN,
        'Content-Type': 'application/json'
      }
    };
    if (data) config.data = data;
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Beds24 API Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    beds24Connected: !!BEDS24_TOKEN,
    propertyId: PROPERTY_ID,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/properties', async (req, res) => {
  const result = await beds24Request('/properties');
  res.json(result);
});

app.get('/api/rooms', async (req, res) => {
  const propertyId = req.query.propertyId || PROPERTY_ID;
  const result = await beds24Request(`/properties/${propertyId}/rooms`);
  res.json(result);
});

app.post('/api/availability', async (req, res) => {
  const { checkIn, checkOut, roomId } = req.body;
  if (!checkIn || !checkOut) {
    return res.json({ success: false, error: 'Missing dates' });
  }
  let endpoint = `/availability?propertyId=${PROPERTY_ID}&checkIn=${checkIn}&checkOut=${checkOut}`;
  if (roomId) endpoint += `&roomId=${roomId}`;
  const result = await beds24Request(endpoint);
  res.json(result);
});

app.post('/api/prices', async (req, res) => {
  const { checkIn, checkOut, roomId, numAdults = 2, numChildren = 0 } = req.body;
  if (!checkIn || !checkOut || !roomId) {
    return res.json({ success: false, error: 'Missing parameters' });
  }
  const endpoint = `/prices?propertyId=${PROPERTY_ID}&roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&numAdults=${numAdults}&numChildren=${numChildren}`;
  const result = await beds24Request(endpoint);
  res.json(result);
});

app.post('/api/book', async (req, res) => {
  const { roomId, checkIn, checkOut, numAdults = 2, numChildren = 0, firstName, lastName, email, phone, price, currency = 'USD', notes } = req.body;
  if (!roomId || !checkIn || !checkOut || !firstName || !lastName || !email) {
    return res.json({ success: false, error: 'Missing required information' });
  }
  const bookingData = {
    propertyId: PROPERTY_ID,
    roomId, checkIn, checkOut, numAdults, numChildren,
    firstName, lastName, email,
    phone: phone || '',
    price: price || 0,
    currency,
    status: 1,
    notes: notes || 'Booked via website'
  };
  const result = await beds24Request('/bookings', 'POST', bookingData);
  res.json(result);
});

app.get('/api/bookings', async (req, res) => {
  const result = await beds24Request('/bookings');
  res.json(result);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Beds24 Token: ${BEDS24_TOKEN ? 'Configured' : 'Missing'}`);
  console.log(`🏨 Property ID: ${PROPERTY_ID}`);
});

// Special endpoint to exchange invite code for refresh token
app.post('/api/setup-auth', async (req, res) => {
  const { inviteCode } = req.body;
  try {
    const response = await axios.get(
      `https://beds24.com/api/v2/authentication/setup?code=${encodeURIComponent(inviteCode)}`
    );
    res.json({ success: true, refreshToken: response.data.refreshToken });
  } catch (error) {
    res.json({ success: false, error: error.response?.data || error.message });
  }
});
