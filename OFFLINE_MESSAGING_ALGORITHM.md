# WhatsApp-Level Offline Messaging Algorithm

## Complete Production-Ready Implementation

---

## 🎯 Algorithm Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  MESSAGE SENDING FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. User sends message
   ↓
2. Save to MongoDB with status="sent"
   ↓
3. Check Redis: Is receiver online?
   ├─ YES (Online)
   │  ├─ Emit message via Socket.IO instantly
   │  └─ Update DB: status="delivered"
   │
   └─ NO (Offline)
      ├─ Keep message in DB with status="sent"
      └─ Optional: Send push notification


┌─────────────────────────────────────────────────────────────┐
│              RECONNECTION/ONLINE FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. User comes online (socket connects)
   ↓
2. Mark user online in Redis + MongoDB
   ↓
3. Query DB: Find all pending messages
   WHERE recipient=userId AND status="sent"
   ↓
4. Deliver all pending messages via Socket.IO
   ↓
5. Update each message: status="delivered"


┌─────────────────────────────────────────────────────────────┐
│                   DISCONNECT FLOW                           │
└─────────────────────────────────────────────────────────────┘

1. User disconnects (socket closes)
   ↓
2. Mark user offline in Redis + MongoDB
   ↓
3. Update lastSeen timestamp
   ↓
4. Broadcast to friends: user_offline event
```

---

## 📊 Data Flow Diagram

```
SENDER                  SOCKET SERVER              REDIS         MONGODB
  │                           │                      │              │
  │────[send message]────────►│                      │              │
  │                           │                      │              │
  │                           │──[save msg]─────────────────────►  │
  │                           │                      │              │
  │                           │──[check online]────► │              │
  │                           │◄─[online status]──── │              │
  │                           │                      │              │
  │◄─────[ack: sent]──────────│                      │              │
  │                           │                      │              │
  │                           │                      │              │
RECEIVER (ONLINE)             │                      │              │
  │                           │                      │              │
  │◄──[receive_message]───────│                      │              │
  │                           │                      │              │
  │                           │──[update status]────────────────►  │
  │                           │   status="delivered" │              │


RECEIVER (OFFLINE)            │                      │              │
  │                           │                      │              │
  │    [message stays         │                      │              │
  │     pending in DB]        │                      │              │
  │                           │                      │              │
  │────[connects]────────────►│                      │              │
  │                           │                      │              │
  │                           │──[mark online]──────►│              │
  │                           │                      │              │
  │                           │──[get pending]──────────────────►  │
  │◄──[pending messages]──────│◄─────────────────────────────────  │
  │                           │                      │              │
  │                           │──[update status]────────────────►  │
```

---

## 🔧 Implementation Details

### 1. **Redis Schema**

```
Key Pattern: "online:{userId}"
Value: socketId
TTL: 24 hours

Example:
Key: online:507f1f77bcf86cd799439011
Value: ABC123SocketID
```

### 2. **MongoDB Message Schema**

```javascript
{
  _id: ObjectId,
  sender: ObjectId (ref: User),
  recipient: ObjectId (ref: User),
  content: String (encrypted),
  timestamp: Date,
  status: "sent" | "delivered" | "read",  // ← KEY FIELD
  readAt: Date
}
```

### 3. **MongoDB User Schema**

```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  isOnline: Boolean,        // ← Updated via socket
  lastSeen: Date,           // ← Updated on disconnect
  friends: [ObjectId]
}
```

---

## 💻 Pseudocode

### Send Message Algorithm

```python
function sendMessage(sender, receiver, text):
    # STEP 1: Save to database first
    msg = DB.save({
        sender: sender,
        receiver: receiver,
        content: text,
        status: "sent",      # Initially "sent"
        timestamp: now()
    })

    # STEP 2: Check if receiver is online
    socketId = Redis.get("online:" + receiver)

    if socketId exists:
        # Receiver is ONLINE
        Socket.emit(socketId, "receive_message", msg)

        # Update status to delivered
        DB.update(msg, { status: "delivered" })

        return { status: "delivered", online: true }
    else:
        # Receiver is OFFLINE
        # Message stays in "sent" state
        # Optional: send push notification
        PushNotification.send(receiver, "New message from " + sender)

        return { status: "sent", online: false }
```

### Connect/Online Algorithm

```python
function onConnect(user, socketId):
    # STEP 1: Mark user online
    Redis.set("online:" + user.id, socketId, ttl=86400)
    DB.update(user, {
        isOnline: true,
        lastSeen: now()
    })

    # STEP 2: Broadcast to friends
    friends = DB.find(user.friends)
    for friend in friends:
        Socket.emit("user:"+friend.id, "user_online", {
            userId: user.id,
            timestamp: now()
        })

    # STEP 3: Deliver pending messages
    pending = DB.find({
        recipient: user.id,
        status: "sent"
    }).sort({ timestamp: 1 })

    for msg in pending:
        # Send each pending message
        Socket.emit(socketId, "receive_message", msg)

        # Mark as delivered
        DB.update(msg, { status: "delivered" })

    log("Delivered " + pending.length + " pending messages")
```

### Disconnect/Offline Algorithm

```python
function onDisconnect(user):
    # STEP 1: Mark user offline
    Redis.delete("online:" + user.id)
    DB.update(user, {
        isOnline: false,
        lastSeen: now()
    })

    # STEP 2: Broadcast to friends
    friends = DB.find(user.friends)
    for friend in friends:
        Socket.emit("user:"+friend.id, "user_offline", {
            userId: user.id,
            lastSeen: now()
        })
```

---

## 🚀 Performance Optimizations

### 1. **Redis for O(1) Lookups**

- Online status check: ~0.5ms (Redis)
- vs MongoDB query: ~50ms
- **100x faster!**

### 2. **Batch Pending Messages**

```javascript
// Instead of N queries:
for (msg of pendingMessages) {
  await msg.save();
}

// Use bulk operation:
await Message.bulkWrite(
  pendingMessages.map((msg) => ({
    updateOne: {
      filter: { _id: msg._id },
      update: { status: "delivered" },
    },
  })),
);
```

### 3. **Index Optimization**

```javascript
// Add compound index for pending message queries
messageSchema.index({ recipient: 1, status: 1, timestamp: 1 });

// Query becomes blazing fast
db.messages.find({ recipient: userId, status: "sent" });
// Uses index scan instead of collection scan
```

---

## 🔐 Security Considerations

### 1. **Rate Limiting**

```javascript
// Prevent message spam
if (user.messagesSentInLastMinute > 50) {
  throw new Error("Rate limit exceeded");
}
```

### 2. **Friend Verification**

```javascript
// Only allow messaging between friends
const isFriend = await User.exists({
  _id: senderId,
  friends: recipientId,
});

if (!isFriend) {
  throw new Error("Not authorized");
}
```

### 3. **Message Encryption**

```javascript
// Encrypt before saving
const encrypted = AES.encrypt(content, SECRET_KEY);
await Message.create({ content: encrypted });

// Decrypt when retrieving
const decrypted = AES.decrypt(encrypted, SECRET_KEY);
```

---

## 📱 Push Notification Integration

```javascript
// Add to send_message handler when user offline
if (!isReceiverOnline) {
  // Using Firebase Cloud Messaging (FCM)
  await admin.messaging().sendToDevice(receiverFCMToken, {
    notification: {
      title: senderName,
      body: content.substring(0, 100),
      sound: "default",
      badge: "1",
    },
    data: {
      type: "new_message",
      senderId: senderId,
      messageId: messageId,
    },
  });
}
```

---

## 📈 Monitoring & Analytics

### Key Metrics to Track

1. **Message Delivery Time**
   - Online: < 100ms
   - Offline: On next connect

2. **Pending Message Count**
   - Monitor per user
   - Alert if > 1000 undelivered

3. **Redis Hit Rate**
   - Should be > 95%
   - Falls back to MongoDB if miss

4. **Connection Success Rate**
   - Monitor reconnection attempts
   - Alert if > 5% failure rate

---

## 🧪 Testing Scenarios

### Test Case 1: Both Users Online

```
1. User A sends message to User B (both online)
2. ✅ Message appears instantly in User B's chat
3. ✅ Status changes: sent → delivered → read
```

### Test Case 2: Receiver Offline

```
1. User A sends message to User B (B offline)
2. ✅ Message saved with status="sent"
3. ✅ User A sees single checkmark
4. User B comes online
5. ✅ Message delivered instantly
6. ✅ Status changes to "delivered"
```

### Test Case 3: Multiple Pending Messages

```
1. User A sends 10 messages while User B offline
2. ✅ All saved with status="sent"
3. User B comes online
4. ✅ All 10 messages delivered in order
5. ✅ All statuses updated to "delivered"
```

### Test Case 4: Network Interruption

```
1. User A sends message
2. Network drops before socket emit
3. ✅ Message still saved in DB
4. ✅ Delivered when User A reconnects
```

---

## 🛠️ Installation & Setup

See: [REDIS_SETUP.md](./REDIS_SETUP.md)

---

## 📚 References

- Socket.IO Documentation: https://socket.io/docs/
- Redis Documentation: https://redis.io/docs/
- MongoDB Indexes: https://docs.mongodb.com/manual/indexes/

---

**Built with ❤️ for production-grade real-time messaging**
