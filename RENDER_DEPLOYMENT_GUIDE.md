# Render Deployment Guide

## Critical Issue Identified

The deployment is failing with this error:

```
❌ MongoDB connection error: The `uri` parameter to `openUri()` must be a string, got "undefined"
```

## Root Cause

The application expects the `MONGODB_URI` environment variable to be set, but it's not configured in your Render environment.

## Solution

### Step 1: Add Environment Variable in Render

1. Go to your Render dashboard
2. Navigate to your project
3. Click on "Environment" tab
4. Add the following environment variable:

| Variable Name        | Value                                  | Description                      |
| -------------------- | -------------------------------------- | -------------------------------- |
| `MONGODB_URI`        | Your MongoDB connection string         | Required for database connection |
| `JWT_SECRET`         | Your JWT secret (min 32 chars)         | Required for authentication      |
| `JWT_REFRESH_SECRET` | Your JWT refresh secret (min 32 chars) | Required for token refresh       |
| `ENCRYPTION_KEY`     | Your encryption key (min 32 chars)     | Required for message encryption  |
| `NODE_ENV`           | `production`                           | Required for production mode     |
| `SOCKET_CORS_ORIGIN` | `*` or your domain                     | Required for Socket.io CORS      |

### Step 2: MongoDB Connection

You need a MongoDB instance. Options:

**Option A: MongoDB Atlas (Recommended)**

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free account
3. Create a new cluster
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Set `MONGODB_URI` in Render to this string

**Option B: Render MongoDB (Easier)**

1. In Render dashboard, go to "Databases"
2. Click "Create Database"
3. Choose MongoDB
4. Render will provide the connection string
5. Set `MONGODB_URI` automatically

### Step 3: Generate Secure Keys

Generate strong random secrets for production:

```bash
# Generate JWT_SECRET (32 characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET (32 characters)
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (32 characters)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** Use the generated values, NOT the placeholder values from `.env.example`

### Step 4: Deploy

After setting all environment variables, click "Deploy" in Render.

## Verification

After deployment, verify:

1. Check the deployment logs for successful startup
2. The application should show: `> Ready on http://localhost:3000`
3. No MongoDB connection errors

## Troubleshooting

### Issue: Still getting MongoDB error?

If you're still seeing the MongoDB error after setting `MONGODB_URI`:

1. **Check variable name spelling** - Must be exactly `MONGODB_URI` (not `MONGO_URI`)
2. **Check for trailing spaces** - No spaces before or after the variable name
3. **Verify the value** - Make sure it's a valid MongoDB connection string
4. **Check MongoDB access** - If using MongoDB Atlas, whitelist your Render IP in Network Access

### Issue: Socket.io not connecting?

If Socket.io connections fail:

1. **Check CORS origin** - Set `SOCKET_CORS_ORIGIN` to your production domain
2. **Check port** - Ensure port 3000 is accessible
3. **Check firewall** - Verify WebSocket connections are allowed

## Additional Notes

- The application uses `server.js` as the entry point (configured in `package.json`)
- Socket.io runs on port 3000
- Next.js API routes are served through the same server
- Rate limiting is enabled on all endpoints
- Security headers are configured

## Quick Reference

For more details on the implementation, see:

- [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [`SECURITY_GUIDE.md`](SECURITY_GUIDE.md) - Security quick reference
- [`PROJECT_AUDIT_REPORT.md`](PROJECT_AUDIT_REPORT.md) - Original audit findings
- [`PROJECT_IMPROVEMENTS.md`](PROJECT_IMPROVEMENTS.md) - Improvement suggestions

## Support

If you continue to have issues after following this guide:

1. Check Render logs: https://dashboard.render.com/logs
2. Review Render documentation: https://render.com/docs
3. Check MongoDB Atlas status: https://cloud.mongodb.com/
