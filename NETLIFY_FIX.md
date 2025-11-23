# Fix Netlify 404 Error

## Problem
Getting "Page not found" error on Netlify after deployment.

## Solution

### Step 1: Add _redirects file
Already created at `client/public/_redirects` with:
```
/*    /index.html   200
```

### Step 2: Rebuild and Redeploy

```bash
cd client
npm run build
```

Then drag the `build` folder to Netlify again.

### Step 3: Verify Netlify Settings

In Netlify dashboard:
1. Go to **Site settings** → **Build & deploy**
2. Verify:
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
   - **Base directory**: Leave empty OR set to `client`

### Step 4: If using GitHub deployment

Update Netlify build settings:
- **Base directory**: `client`
- **Build command**: `npm run build`
- **Publish directory**: `client/build`

### Step 5: Clear cache and redeploy

In Netlify:
1. Go to **Deploys**
2. Click **Trigger deploy** → **Clear cache and deploy site**

## Alternative: Manual Deploy

1. Build locally:
```bash
cd client
npm install
npm run build
```

2. The `build` folder will be created
3. Go to Netlify → **Deploys** → **Drag and drop**
4. Drag the entire `build` folder

## Common Issues

**Still getting 404?**
- Check if `_redirects` file is in `public` folder
- Verify `build` folder contains `index.html`
- Check browser console for errors

**Build fails?**
- Run `npm install` first
- Check for missing dependencies
- Verify Node version (use 18.x)

**Routes not working?**
- Ensure `_redirects` file is present
- Check React Router is properly configured

## Test Locally

Before deploying, test the build:
```bash
cd client
npm run build
npx serve -s build
```

Open http://localhost:3000 and test all routes.
