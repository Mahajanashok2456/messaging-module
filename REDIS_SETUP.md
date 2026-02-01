# Redis Setup Guide

## Installation & Configuration for Offline Messaging

---

## 📦 Install Redis Client

```bash
npm install redis
```

---

## 🔧 Local Development Setup

### Option 1: Install Redis Locally (Recommended for Development)

#### Windows:

```bash
# Using Chocolatey
choco install redis-64

# Or download from:
# https://github.com/microsoftarchive/redis/releases
```

#### Mac:

```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian):

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

#### Test Connection:

```bash
redis-cli ping
# Should return: PONG
```

### Option 2: Use Free Cloud Redis (Easier)

**Upstash.com** - Free Redis with 10k commands/day:

1. Visit https://upstash.com
2. Create free account
3. Create Redis database
4. Copy Redis URL

---

## 🌍 Production Setup

### Render.com (Recommended)

1. Go to https://render.com
2. Create new **Redis** instance
3. Choose free tier (25MB storage)
4. Copy **Internal Redis URL**

### Railway.app

1. Go to https://railway.app
2. Add **Redis** service
3. Copy **REDIS_URL** from variables

### Redis Cloud

1. Visit https://redis.com/try-free
2. Create free account (30MB)
3. Create database
4. Copy connection string

---

## 🔐 Environment Variables

### Development (.env.local)

```bash
# Local Redis
REDIS_URL=redis://localhost:6379

# Or Upstash Cloud Redis
REDIS_URL=redis://default:YOUR_PASSWORD@your-endpoint.upstash.io:6379
```

### Production (Render/Vercel)

```bash
# Add to environment variables:
REDIS_URL=redis://red-xxxxx:6379
```

---

## ✅ Verify Redis Connection

Create test file: `test-redis.js`

```javascript
const redis = require("redis");

async function testRedis() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  client.on("error", (err) => console.error("Redis Error:", err));
  client.on("connect", () => console.log("✅ Redis Connected"));

  await client.connect();

  // Test SET
  await client.set("test_key", "Hello Redis!");
  console.log("✅ SET successful");

  // Test GET
  const value = await client.get("test_key");
  console.log("✅ GET successful:", value);

  // Test DEL
  await client.del("test_key");
  console.log("✅ DEL successful");

  await client.quit();
  console.log("✅ Connection closed");
}

testRedis();
```

Run:

```bash
node test-redis.js
```

Expected output:

```
✅ Redis Connected
✅ SET successful
✅ GET successful: Hello Redis!
✅ DEL successful
✅ Connection closed
```

---

## 🚀 Start Your Servers

### Development:

```bash
# Terminal 1: Next.js frontend
npm run dev

# Terminal 2: Socket server with Redis
node socket-server.js
```

### Production (Render.com):

**Build Command:**

```bash
npm install
```

**Start Command:**

```bash
node socket-server.js
```

**Environment Variables:**

```
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_url
FRONTEND_URL=https://your-frontend.vercel.app
PORT=5000
```

---

## 🧪 Test Offline Messaging

### Test Scenario:

1. **Open 2 browser tabs**
   - Tab 1: User A
   - Tab 2: User B

2. **Make User B offline:**
   - Close Tab 2 (User B)
   - Check console: "User B is now OFFLINE"

3. **User A sends messages:**
   - Send 3-5 messages from Tab 1
   - Console: "Receiver OFFLINE - message stays PENDING"

4. **Bring User B online:**
   - Reopen Tab 2 (User B logs in)
   - Console: "Delivering 3 pending messages"
   - ✅ All messages appear instantly!

---

## 📊 Monitor Redis

### Redis CLI Commands:

```bash
redis-cli

# Check online users
KEYS online:*

# Check specific user
GET online:507f1f77bcf86cd799439011

# Count online users
DBSIZE

# Monitor real-time commands
MONITOR

# Check memory usage
INFO memory
```

---

## 🐛 Troubleshooting

### Issue: "Redis connection failed"

**Solution:**

```javascript
// In lib/redis.js - already handles this!
// Falls back to in-memory Map if Redis unavailable
if (!redisClient) {
  console.log("⚠️ Using in-memory fallback");
  onlineUsersMap.set(userId, socketId);
}
```

### Issue: "ECONNREFUSED"

**Check:**

1. Redis server running: `redis-cli ping`
2. Correct URL in .env
3. Firewall not blocking port 6379

### Issue: "ERR AUTH failed"

**Solution:**

- Check Redis password in connection URL
- Format: `redis://default:PASSWORD@host:port`

---

## 📈 Redis Best Practices

### 1. Set Expiration Times

```javascript
// Online users expire after 24 hours
await client.setEx(`online:${userId}`, 86400, socketId);
```

### 2. Use Key Namespaces

```javascript
// Good: organized by feature
online: {
  userId;
}
typing: {
  userId;
}
presence: {
  userId;
}

// Bad: no namespace
{
  userId;
}
```

### 3. Limit Key Size

```javascript
// Good: concise keys
online:507f1f77bcf86cd799439011

// Bad: verbose keys
user_online_status:507f1f77bcf86cd799439011
```

### 4. Clean Up on Disconnect

```javascript
socket.on("disconnect", async () => {
  await client.del(`online:${userId}`);
});
```

---

## 💰 Cost Comparison

| Provider        | Free Tier        | Paid Plans          |
| --------------- | ---------------- | ------------------- |
| **Upstash**     | 10k commands/day | $0.20/100k commands |
| **Render**      | 25MB storage     | $7/month (256MB)    |
| **Redis Cloud** | 30MB             | $5/month (100MB)    |
| **Railway**     | $5 credit/month  | Pay as you go       |

**Recommendation:** Start with Upstash (easiest) or Render (integrated)

---

## 🔒 Security

### Production Checklist:

- [ ] Use TLS connection (`rediss://`)
- [ ] Strong password (32+ chars)
- [ ] Restrict IP access
- [ ] Enable AUTH
- [ ] Regular backups
- [ ] Monitor unusual activity

---

## 📚 Additional Resources

- Redis Node.js Client: https://github.com/redis/node-redis
- Redis Commands: https://redis.io/commands/
- Redis Data Types: https://redis.io/topics/data-types
- Upstash Docs: https://docs.upstash.com/

---

**Ready to go! Your app now has production-grade offline messaging 🚀**
