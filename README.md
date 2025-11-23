# PingNow Chat App

## Deploy to Railway

1. Push code to GitHub
2. Go to [Railway](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo
5. Set root directory to `server`
6. Add environment variable: `PORT` (Railway auto-assigns)
7. Deploy

## Deploy Frontend to Netlify

1. Go to [Netlify](https://netlify.com)
2. Click "Add new site" → "Import from Git"
3. Select your repo
4. Set base directory to `client`
5. Build command: `npm run build`
6. Publish directory: `build`
7. Add environment variables:
   - `REACT_APP_API_URL`: Your Railway backend URL
   - `REACT_APP_SOCKET_URL`: Your Railway backend URL
8. Deploy

## Local Development

```bash
# Server
cd server
npm install
npm start

# Client
cd client
npm install
npm start
```
