# PingNow Deployment Guide

## Deploy Backend (Server) to Render/Railway

### Option 1: Render.com (Recommended)

1. **Create account** at https://render.com
2. **New Web Service** → Connect GitHub repo
3. **Settings:**
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment: Node
4. **Environment Variables:**
   - `PORT=5000`
   - `JWT_SECRET=your-secret-key-here`
5. **Deploy** → Copy your backend URL (e.g., `https://pingnow-api.onrender.com`)

### Option 2: Railway.app

1. **Create account** at https://railway.app
2. **New Project** → Deploy from GitHub
3. **Settings:**
   - Root Directory: `server`
   - Start Command: `npm start`
4. **Environment Variables:**
   - `PORT=5000`
   - `JWT_SECRET=your-secret-key-here`
5. **Deploy** → Copy your backend URL

## Deploy Frontend (Client) to Netlify

### Step 1: Update API URLs

Edit `client/src/context/SocketContext.js`:
```javascript
const newSocket = io('https://your-backend-url.onrender.com');
```

Edit all API fetch calls to use your backend URL:
```javascript
const res = await fetch('https://your-backend-url.onrender.com/api/users');
```

### Step 2: Build and Deploy

1. **Build locally:**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to https://netlify.com
   - Drag & drop the `build` folder
   - OR connect GitHub repo

3. **Netlify Settings:**
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: 18

### Step 3: Update netlify.toml

Replace `your-backend-url.herokuapp.com` with your actual backend URL in `client/netlify.toml`

## Environment Variables

### Backend (.env)
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=production
```

### Frontend
Update these in code:
- Socket URL in `SocketContext.js`
- API base URL in all fetch calls

## Post-Deployment Checklist

- ✅ Backend is running and accessible
- ✅ Frontend can connect to backend
- ✅ WebSocket connection works
- ✅ File uploads work
- ✅ Calls work (check STUN/TURN servers)
- ✅ HTTPS enabled on both frontend and backend

## Troubleshooting

**WebSocket not connecting:**
- Ensure backend URL uses `https://` not `http://`
- Check CORS settings in server

**Calls not working:**
- Add TURN server for production WebRTC
- Update `client/src/utils/webrtc.js` with TURN credentials

**API errors:**
- Check backend logs on Render/Railway
- Verify environment variables are set

## Free Hosting Limits

**Render.com:**
- Free tier: 750 hours/month
- Sleeps after 15 min inactivity
- Wakes up on request (slow first load)

**Netlify:**
- 100GB bandwidth/month
- Unlimited sites
- Auto SSL

**Railway:**
- $5 free credit/month
- Pay as you go after

## Production Optimizations

1. **Add TURN Server** for WebRTC (Twilio, Metered.ca)
2. **Use CDN** for media files
3. **Enable compression** on server
4. **Add rate limiting**
5. **Use Redis** for session storage
6. **Add monitoring** (Sentry, LogRocket)
