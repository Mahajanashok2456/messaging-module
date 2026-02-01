# Deployment Guide: Vercel + Render

## Overview
- **Frontend (Next.js)**: Deploy on Vercel
- **Socket.io Server**: Deploy on Render
- **Database**: MongoDB Atlas

---

## Part 1: Deploy Socket.io Server on Render

### Step 1: Push Code to GitHub
Your code is already pushed. Make sure `socket-server.js` is committed:

```bash
git add socket-server.js render.yaml
git commit -m "Add standalone Socket.io server for Render"
git push origin main
```

### Step 2: Create Render Account
1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your repository: `Mahajanashok2456/messaging-module`
3. Configure:

**Basic Settings:**
- **Name**: `messaging-socket-server`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node socket-server.js`

**Environment Variables** (Click "Advanced" → "Add Environment Variable"):
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://your-user:your-password@cluster.mongodb.net/messaging
PORT=5000
FRONTEND_URL=https://your-app.vercel.app
```

4. Choose **Free** plan
5. Click **"Create Web Service"**

### Step 4: Wait for Deployment
- Wait 2-3 minutes for build to complete
- Once deployed, note your Render URL: `https://messaging-socket-server.onrender.com`

### Step 5: Test Socket Server
Visit: `https://your-render-url.onrender.com/health`

Should return:
```json
{
  "status": "ok",
  "mongodb": "connected",
  "timestamp": "2026-02-01T..."
}
```

---

## Part 2: Deploy Frontend on Vercel

### Step 1: Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Set Environment Variables

Create `.env.production` file:
```env
MONGODB_URI=mongodb+srv://your-user:your-password@cluster.mongodb.net/messaging
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-exactly-32-chars
NEXT_PUBLIC_SOCKET_URL=https://messaging-socket-server.onrender.com
NODE_ENV=production
```

### Step 4: Deploy to Vercel

**Option A: Using CLI**
```bash
# Deploy (will prompt for settings)
vercel

# After successful preview, deploy to production
vercel --prod
```

**Option B: Using Vercel Dashboard**
1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. **Add Environment Variables**:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret-key
   ENCRYPTION_KEY=your-encryption-key
   NEXT_PUBLIC_SOCKET_URL=https://messaging-socket-server.onrender.com
   NODE_ENV=production
   ```

6. Click **"Deploy"**

### Step 5: Update Render Environment
After Vercel deployment, update Render's `FRONTEND_URL`:

1. Go to Render Dashboard
2. Select your Socket.io service
3. Go to **"Environment"**
4. Update `FRONTEND_URL` to your Vercel URL: `https://your-app.vercel.app`
5. Click **"Save Changes"** (will trigger redeploy)

---

## Part 3: MongoDB Atlas Configuration

### Whitelist IPs
1. Go to MongoDB Atlas Dashboard
2. Navigate to **Network Access**
3. Click **"Add IP Address"**
4. Add:
   - `0.0.0.0/0` (allow from anywhere) **OR**
   - Render's IP ranges (check Render docs)
   - Vercel's IP ranges (check Vercel docs)

---

## Part 4: Test Your Deployment

### 1. Test Socket Connection
Open browser console on your Vercel site:
```javascript
// Should see in console:
"Connecting to Socket.io server: https://messaging-socket-server.onrender.com"
"Socket connected: xyz123"
```

### 2. Test Messaging
1. Create two accounts
2. Add each other as friends
3. Send messages
4. Check real-time delivery

### 3. Check Logs

**Render Logs:**
1. Go to Render Dashboard
2. Click on your service
3. View **Logs** tab
4. Should see "User connected" when users login

**Vercel Logs:**
1. Go to Vercel Dashboard
2. Select your project
3. Click **"Functions"** → View logs

---

## Environment Variables Summary

### Render (Socket.io Server)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=https://your-app.vercel.app
PORT=5000
```

### Vercel (Next.js Frontend)
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
NEXT_PUBLIC_SOCKET_URL=https://messaging-socket-server.onrender.com
NODE_ENV=production
```

---

## Quick Deploy Commands

```bash
# 1. Commit Socket server
git add socket-server.js render.yaml
git commit -m "Add Socket.io server"
git push origin main

# 2. Deploy Socket.io to Render (via dashboard)
# Visit render.com and follow steps above

# 3. Deploy frontend to Vercel
vercel --prod
```

---

## Troubleshooting

### Socket Connection Failed
- Check `NEXT_PUBLIC_SOCKET_URL` in Vercel
- Check CORS `FRONTEND_URL` in Render
- Check Render service is running (not sleeping on free tier)

### Messages Not Sending
- Check MongoDB connection in Render logs
- Verify MongoDB Atlas IP whitelist
- Check browser console for errors

### Render Service Sleeping (Free Tier)
- Free tier sleeps after 15 min inactivity
- First request wakes it up (30-60 seconds)
- Consider upgrading to paid tier for 24/7 uptime

---

## Cost Estimate

- **Vercel**: Free (Hobby plan)
- **Render**: Free (with sleep after inactivity) or $7/month (always on)
- **MongoDB Atlas**: Free (512MB) or $9/month (2GB)

**Total**: $0-$16/month

---

## Next Steps After Deployment

1. ✅ Test all features in production
2. ✅ Set up custom domain (optional)
3. ✅ Configure analytics
4. ✅ Set up error monitoring (Sentry)
5. ✅ Enable HTTPS (automatic on Vercel/Render)

Ready to deploy? Start with Step 1 of Part 1!
