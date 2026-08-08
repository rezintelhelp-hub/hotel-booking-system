// Force a re-sync of EasyLandlord's sheet channel (id=3) so any status
// values Karl added after our last cron tick come into inbox_messages.
// Requires server.js's helpers so it must run against the same process
// or spawn its own pool + Google auth. Simpler: hit the admin API.
require('dotenv').config();
const axios = require('axios');
const url = (process.env.GAS_ADMIN_URL || 'https://admin.gas.travel') + '/api/admin/client-sheets/3/sync';
const token = process.env.MASTER_ADMIN_TOKEN;
if (!token) { console.error('Set MASTER_ADMIN_TOKEN env var (grab from your admin session cookie/localStorage)'); process.exit(1); }
axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 })
  .then(r => { console.log('sync result:', JSON.stringify(r.data, null, 2)); })
  .catch(e => { console.error(e.response?.status, e.response?.data || e.message); process.exit(1); });
