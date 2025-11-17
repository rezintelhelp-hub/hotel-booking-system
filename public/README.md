# Hotel Booking System

Connected to Beds24 API for real-time availability and bookings.

## Deploy to Railway

1. Click "New Project" in Railway
2. Select "Deploy from GitHub repo"
3. Choose this repository
4. Add environment variables in Railway:
   - BEDS24_TOKEN
   - PROPERTY_ID
5. Deploy!

## Environment Variables

- `BEDS24_TOKEN` - Your Beds24 Long Life Token
- `PROPERTY_ID` - Your Beds24 Property ID

## Local Development
```bash
npm install
node server.js
```

Visit http://localhost:3000
