# Quick Deploy to Netlify

## Step 1: Deploy Backend (5 minutes)

### Using Render.com (Free)

1. Go to https://render.com and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Settings:
   - **Name**: `pingnow-backend`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `JWT_SECRET` = `your-random-secret-key-123`
   - `PORT` = `5000`
6. Click **Create Web Service**
7. **Copy your backend URL** (e.g., `https://pingnow-backend.onrender.com`)

## Step 2: Update Frontend URLs

1. Create `client/.env` file:
```
REACT_APP_API_URL=https://pingnow-backend.onrender.com
REACT_APP_SOCKET_URL=https://pingnow-backend.onrender.com
```

2. Update `client/netlify.toml` line 5:
```toml
to = "https://pingnow-backend.onrender.com/api/:splat"
```

## Step 3: Deploy Frontend to Netlify

### Option A: Drag & Drop (Easiest)

1. Build the app:
```bash
cd client
npm install
npm run build
```

2. Go to https://netlify.com
3. Drag the `build` folder to Netlify
4. Done! Your app is live

### Option B: GitHub (Recommended)

1. Push code to GitHub
2. Go to https://netlify.com
3. Click **Add new site** → **Import from Git**
4. Select your repository
5. Settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/build`
6. Add Environment Variables:
   - `REACT_APP_API_URL` = `https://pingnow-backend.onrender.com`
   - `REACT_APP_SOCKET_URL` = `https://pingnow-backend.onrender.com`
7. Click **Deploy**

## Step 4: Update Backend CORS

Add your Netlify URL to backend `.env`:
```
CORS_ORIGIN=https://your-app.netlify.app
```

Redeploy backend on Render.

## Done! 🎉

Your app is now live:
- Frontend: `https://your-app.netlify.app`
- Backend: `https://pingnow-backend.onrender.com`

## Troubleshooting

**"Cannot connect to server"**
- Check if backend URL is correct in `.env`
- Verify backend is running on Render

**"WebSocket connection failed"**
- Ensure backend URL uses `https://`
- Check CORS settings

**"First load is slow"**
- Render free tier sleeps after 15 min
- First request wakes it up (takes 30-60 seconds)

## Free Tier Limits

- **Render**: 750 hours/month (enough for 1 app)
- **Netlify**: 100GB bandwidth/month
- Both have auto-sleep on free tier
