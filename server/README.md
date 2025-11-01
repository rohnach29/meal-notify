# Meal Notify Backend Server

Web Push backend for scheduled meal reminder notifications.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate VAPID keys:**
   ```bash
   npm run generate-keys
   ```

3. **Create `.env` file:**
   Copy `.env.example` to `.env` and add your VAPID keys:
   ```
   VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   PORT=3000
   ```

4. **Run the server:**
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

## API Endpoints

- `GET /api/vapid-key` - Get VAPID public key
- `POST /api/subscribe` - Subscribe to push notifications
- `POST /api/update-schedule` - Update notification schedule
- `POST /api/unsubscribe` - Unsubscribe from notifications
- `POST /api/test-notification` - Send test notification

## Deployment

### Vercel

Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    }
  ]
}
```

### Other Platforms

The server can be deployed to any Node.js hosting platform:
- Heroku
- Railway
- Render
- Fly.io
- DigitalOcean App Platform

Make sure to set the `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` environment variables.

