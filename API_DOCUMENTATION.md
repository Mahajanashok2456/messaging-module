# API Documentation

**Base URL:** `http://localhost:3000/api`  
**Version:** 1.0.0  
**Last Updated:** February 1, 2026

---

## Table of Contents

- [Authentication](#authentication)
  - [Register](#post-authregister)
  - [Login](#post-authlogin)
  - [Get Profile](#get-authprofile)
- [Messages](#messages)
  - [Send Message](#post-messagessend)
  - [Get Message History](#get-messageshistoryuserid)
- [Friends](#friends)
  - [Search Users](#get-friendssearch)
  - [Send Friend Request](#post-friendsrequest)
  - [Accept Friend Request](#post-friendsrequestaccept)
  - [Reject Friend Request](#post-friendsrequestreject)
  - [Get Friend List](#get-friendslist)
  - [Get Friend Requests](#get-friendsrequests)
- [Chats](#chats)
  - [Get or Create Chat](#post-chatsget-or-create)
  - [Get User Chats](#get-usersidchats)
  - [Get Chat Messages](#get-chatschatidmessages)
- [Rate Limits](#rate-limits)
- [Error Codes](#error-codes)

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### POST /auth/register

Register a new user account.

**Rate Limit:** 3 requests per hour

**Request Body:**

```json
{
  "username": "string (3-30 chars)",
  "email": "string (valid email)",
  "password": "string (min 8 chars, uppercase, lowercase, number, special char)"
}
```

**Success Response (201):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Set-Cookie:**

```
refreshToken=<refresh_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Error Responses:**

- **400 Bad Request** - Invalid input or validation error

  ```json
  {
    "message": "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
  }
  ```

- **429 Too Many Requests** - Rate limit exceeded
  ```json
  {
    "message": "Too many requests, please try again later",
    "retryAfter": 3600
  }
  ```

**Password Requirements:**

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (@$!%\*?&)

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "MySecure@2025"
  }'
```

---

### POST /auth/login

Authenticate user and receive access token.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Set-Cookie:**

```
refreshToken=<refresh_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Error Responses:**

- **400 Bad Request** - Missing email or password

  ```json
  {
    "message": "Please provide email and password"
  }
  ```

- **401 Unauthorized** - Invalid credentials

  ```json
  {
    "message": "Invalid credentials. 3 attempts remaining"
  }
  ```

- **429 Too Many Requests** - Account locked or rate limited
  ```json
  {
    "message": "Account locked due to multiple failed attempts. Try again in 15 minutes"
  }
  ```

**Account Lockout:**

- Locks after 5 failed login attempts
- Lockout duration: 15 minutes
- Auto-unlocks after time expires

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "MySecure@2025"
  }'
```

---

### GET /auth/profile

Get authenticated user profile.

**Authentication:** Required

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "john@example.com",
      "isOnline": true,
      "friends": ["507f1f77bcf86cd799439012"],
      "createdAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

**Error Responses:**

- **401 Unauthorized** - No token or invalid token
  ```json
  {
    "message": "Unauthorized"
  }
  ```

**Example:**

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

---

## Messages

### POST /messages/send

Send a message to another user.

**Rate Limit:** 50 requests per 15 minutes

**Authentication:** Required

**Request Body:**

```json
{
  "recipientId": "string (MongoDB ObjectId)",
  "content": "string (message text)"
}
```

**Success Response (201):**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "sender": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe"
  },
  "recipient": {
    "_id": "507f1f77bcf86cd799439012",
    "username": "jane_doe"
  },
  "content": "Hello there!",
  "timestamp": "2025-02-01T14:30:00Z",
  "status": "sent"
}
```

**Error Responses:**

- **400 Bad Request** - Missing or invalid input

  ```json
  {
    "message": "recipientId and content are required"
  }
  ```

- **404 Not Found** - Recipient doesn't exist

  ```json
  {
    "message": "Recipient not found"
  }
  ```

- **400 Bad Request** - Not friends with recipient

  ```json
  {
    "message": "You can only message friends"
  }
  ```

- **429 Too Many Requests** - Rate limit exceeded
  ```json
  {
    "message": "Too many requests, please try again later",
    "retryAfter": 60
  }
  ```

**Note:** Message content is automatically sanitized to prevent XSS attacks.

**Example:**

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "507f1f77bcf86cd799439012",
    "content": "Hello there!"
  }'
```

---

### GET /messages/history/:userId

Get message history with a specific user.

**Authentication:** Required

**URL Parameters:**

- `userId` - MongoDB ObjectId of the other user

**Query Parameters:**

- `limit` (optional) - Number of messages to return (default: 50, max: 100)
- `before` (optional) - ISO timestamp to get messages before this date

**Success Response (200):**

```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "sender": {
        "_id": "507f1f77bcf86cd799439011",
        "username": "john_doe"
      },
      "recipient": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "jane_doe"
      },
      "content": "Hello there!",
      "timestamp": "2025-02-01T14:30:00Z",
      "status": "read"
    }
  ],
  "hasMore": false
}
```

**Error Responses:**

- **401 Unauthorized** - No token or invalid token
- **404 Not Found** - User doesn't exist

**Example:**

```bash
curl -X GET "http://localhost:3000/api/messages/history/507f1f77bcf86cd799439012?limit=20" \
  -H "Authorization: Bearer <access_token>"
```

---

## Friends

### GET /friends/search

Search for users by username or email.

**Rate Limit:** 30 requests per 15 minutes

**Authentication:** Required

**Query Parameters:**

- `query` - Search term (username or email)

**Success Response (200):**

```json
[
  {
    "id": "507f1f77bcf86cd799439012",
    "name": "jane_doe",
    "username": "jane_doe",
    "email": "jane@example.com",
    "avatar": null,
    "online": true,
    "lastMessage": "",
    "timestamp": "14:30",
    "unread": 0
  }
]
```

**Error Responses:**

- **400 Bad Request** - Missing query parameter

  ```json
  {
    "message": "Query parameter is required"
  }
  ```

- **429 Too Many Requests** - Rate limit exceeded

**Note:** Results exclude:

- Current user
- Existing friends
- Pending sent requests
- Pending received requests

**Example:**

```bash
curl -X GET "http://localhost:3000/api/friends/search?query=jane" \
  -H "Authorization: Bearer <access_token>"
```

---

### POST /friends/request

Send a friend request to another user.

**Authentication:** Required

**Request Body:**

```json
{
  "recipientId": "string (MongoDB ObjectId)"
}
```

**Success Response (200):**

```json
{
  "message": "Friend request sent successfully"
}
```

**Error Responses:**

- **400 Bad Request** - Already friends or request pending
- **404 Not Found** - Recipient doesn't exist

**Example:**

```bash
curl -X POST http://localhost:3000/api/friends/request \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "507f1f77bcf86cd799439012"
  }'
```

---

### POST /friends/request/accept

Accept a pending friend request.

**Authentication:** Required

**Request Body:**

```json
{
  "requesterId": "string (MongoDB ObjectId)"
}
```

**Success Response (200):**

```json
{
  "message": "Friend request accepted"
}
```

**Error Responses:**

- **400 Bad Request** - No pending request from this user
- **404 Not Found** - Requester doesn't exist

**Example:**

```bash
curl -X POST http://localhost:3000/api/friends/request/accept \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "requesterId": "507f1f77bcf86cd799439012"
  }'
```

---

### POST /friends/request/reject

Reject a pending friend request.

**Authentication:** Required

**Request Body:**

```json
{
  "requesterId": "string (MongoDB ObjectId)"
}
```

**Success Response (200):**

```json
{
  "message": "Friend request rejected"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/friends/request/reject \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "requesterId": "507f1f77bcf86cd799439012"
  }'
```

---

### GET /friends/list

Get list of current friends.

**Authentication:** Required

**Success Response (200):**

```json
{
  "friends": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "username": "jane_doe",
      "email": "jane@example.com",
      "isOnline": true,
      "profilePicture": null
    }
  ]
}
```

**Example:**

```bash
curl -X GET http://localhost:3000/api/friends/list \
  -H "Authorization: Bearer <access_token>"
```

---

### GET /friends/requests

Get list of pending friend requests.

**Authentication:** Required

**Success Response (200):**

```json
{
  "requests": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "from": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "jane_doe",
        "email": "jane@example.com"
      },
      "createdAt": "2025-02-01T10:00:00Z"
    }
  ]
}
```

**Example:**

```bash
curl -X GET http://localhost:3000/api/friends/requests \
  -H "Authorization: Bearer <access_token>"
```

---

## Chats

### POST /chats/get-or-create

Get existing chat or create new one between two users.

**Authentication:** Required

**Request Body:**

```json
{
  "otherUserId": "string (MongoDB ObjectId)"
}
```

**Success Response (200):**

```json
{
  "_id": "507f1f77bcf86cd799439015",
  "participants": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "lastMessage": "Hello there!",
  "lastMessageTimestamp": "2025-02-01T14:30:00Z",
  "createdAt": "2025-02-01T10:00:00Z",
  "updatedAt": "2025-02-01T14:30:00Z"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/chats/get-or-create \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "otherUserId": "507f1f77bcf86cd799439012"
  }'
```

---

### GET /users/:id/chats

Get all chats for the authenticated user.

**Authentication:** Required

**URL Parameters:**

- `id` - User ID (must match authenticated user)

**Success Response (200):**

```json
{
  "chats": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "participants": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "username": "jane_doe"
        }
      ],
      "lastMessage": "Hello there!",
      "lastMessageTimestamp": "2025-02-01T14:30:00Z"
    }
  ]
}
```

**Example:**

```bash
curl -X GET http://localhost:3000/api/users/507f1f77bcf86cd799439011/chats \
  -H "Authorization: Bearer <access_token>"
```

---

### GET /chats/:chatId/messages

Get messages for a specific chat.

**Authentication:** Required

**URL Parameters:**

- `chatId` - Chat ID

**Query Parameters:**

- `limit` (optional) - Number of messages (default: 50, max: 100)
- `before` (optional) - ISO timestamp for pagination

**Success Response (200):**

```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "sender": "507f1f77bcf86cd799439011",
      "content": "Hello there!",
      "timestamp": "2025-02-01T14:30:00Z",
      "status": "read"
    }
  ],
  "hasMore": false
}
```

**Example:**

```bash
curl -X GET "http://localhost:3000/api/chats/507f1f77bcf86cd799439015/messages?limit=20" \
  -H "Authorization: Bearer <access_token>"
```

---

## Rate Limits

Rate limits are applied per IP address:

| Endpoint            | Limit       | Window     |
| ------------------- | ----------- | ---------- |
| POST /auth/login    | 5 requests  | 15 minutes |
| POST /auth/register | 3 requests  | 1 hour     |
| POST /messages/send | 50 requests | 15 minutes |
| GET /friends/search | 30 requests | 15 minutes |

**Rate Limit Response (429):**

```json
{
  "message": "Too many requests, please try again later",
  "retryAfter": 120
}
```

**Headers:**

- `retryAfter` indicates seconds until the limit resets

---

## Error Codes

| Code | Description                                      |
| ---- | ------------------------------------------------ |
| 200  | Success                                          |
| 201  | Created                                          |
| 400  | Bad Request - Invalid input                      |
| 401  | Unauthorized - Authentication required or failed |
| 403  | Forbidden - Insufficient permissions             |
| 404  | Not Found - Resource doesn't exist               |
| 429  | Too Many Requests - Rate limit exceeded          |
| 500  | Internal Server Error                            |

**Generic Error Response:**

```json
{
  "message": "Error description"
}
```

---

## WebSocket Events

Connect to: `ws://localhost:3000` or `wss://yourdomain.com`

### Connection

```javascript
const socket = io("http://localhost:3000", {
  auth: { token: accessToken },
});
```

### Events

#### Client → Server

**join_user_room**

```javascript
socket.emit("join_user_room", userId);
```

**send_message**

```javascript
socket.emit("send_message", {
  messageId: "msg_123",
  recipientId: "507f1f77bcf86cd799439012",
  content: "Hello!",
});
```

**typing**

```javascript
socket.emit("typing", {
  userId: "507f1f77bcf86cd799439011",
  recipientId: "507f1f77bcf86cd799439012",
  isTyping: true,
});
```

**message_read**

```javascript
socket.emit("message_read", {
  messageId: "msg_123",
  senderId: "507f1f77bcf86cd799439012",
});
```

#### Server → Client

**receive_message**

```javascript
socket.on("receive_message", (data) => {
  // data: { messageId, senderId, recipientId, content, status }
});
```

**message_sent**

```javascript
socket.on("message_sent", (data) => {
  // data: { messageId, status, timestamp }
});
```

**user_typing**

```javascript
socket.on("user_typing", (data) => {
  // data: { userId, isTyping }
});
```

**message_read_receipt**

```javascript
socket.on("message_read_receipt", (data) => {
  // data: { messageId, readAt }
});
```

---

## Security

### Authentication

- JWT tokens with 1-hour expiration for access tokens
- Refresh tokens with 7-day expiration in httpOnly cookies
- Token rotation on refresh

### Input Validation

- All inputs are sanitized to prevent XSS attacks
- HTML special characters are escaped
- Email format validation
- Strong password requirements enforced

### Rate Limiting

- IP-based rate limiting on all endpoints
- Account lockout after 5 failed login attempts (15-minute lockout)

### Security Headers

- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security (production)

---

## Support

For questions or issues:

- See: [SECURITY_GUIDE.md](SECURITY_GUIDE.md)
- See: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

**Last Updated:** February 1, 2026
