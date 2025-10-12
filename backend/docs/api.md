# Real-Time Messaging API Documentation

## Base URL

All API endpoints are relative to: `http://localhost:5000/api`

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Authentication

### Register a new user
**POST** `/api/auth/register`

Registers a new user in the system.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string"
    },
    "token": "string"
  }
}
```

### Login
**POST** `/api/auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string"
    },
    "token": "string"
  }
}
```

### Get User Profile
**GET** `/api/auth/profile`

Retrieves the authenticated user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string",
      "friends": ["string"],
      "friendRequests": ["object"],
      "sentRequests": ["object"],
      "isOnline": "boolean",
      "lastSeen": "date",
      "profilePicture": "string"
    }
  }
}
```

## Users

### Get User Friends
**GET** `/api/users/me/friends`

Retrieves the list of friends for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "string",
    "username": "string",
    "email": "string",
    "isOnline": "boolean",
    "profilePicture": "string"
  }
]
```

### Get User Friend Requests
**GET** `/api/users/me/requests`

Retrieves all pending friend requests for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "string",
    "from": {
      "_id": "string",
      "username": "string",
      "email": "string"
    },
    "createdAt": "date"
  }
]
```

## Friends

### Send Friend Request
**POST** `/api/friends/request`

Sends a friend request to another user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "recipientId": "string"
}
```

**Response:**
```json
{
  "message": "Friend request sent successfully"
}
```

### Accept Friend Request
**PUT** `/api/friends/request/accept`

Accepts a friend request.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "requestId": "string"
}
```

**Response:**
```json
{
  "message": "Friend request accepted"
}
```

### Reject Friend Request
**PUT** `/api/friends/request/reject`

Rejects a friend request.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "requestId": "string"
}
```

**Response:**
```json
{
  "message": "Friend request rejected"
}
```

### Get Friend Requests
**GET** `/api/friends/requests`

*Alternative endpoint: GET /api/users/me/requests*

Retrieves all pending friend requests for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "string",
    "from": {
      "_id": "string",
      "username": "string",
      "email": "string"
    },
    "createdAt": "date"
  }
]
```

### Get Friends List
**GET** `/api/friends/list`

*Alternative endpoint: GET /api/users/me/friends*

Retrieves the list of friends for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "string",
    "username": "string",
    "email": "string",
    "isOnline": "boolean",
    "profilePicture": "string"
  }
]
```

### Search Users
**GET** `/api/friends/search?query={searchTerm}`

Searches for users by username or email.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `query`: Search term (string)

**Response:**
```json
[
  {
    "_id": "string",
    "username": "string",
    "email": "string",
    "isOnline": "boolean",
    "profilePicture": "string"
  }
]
```

## Chats

### Get or Create Chat
**POST** `/api/chats/get-or-create`

Gets or creates a chat between the authenticated user and another user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "recipientId": "string"
}
```

**Response:**
```json
{
  "chatId": "string",
  "participants": ["string"]
}
```

### Get Chat Messages
**GET** `/api/chats/{chatId}/messages`

Retrieves all messages for a specific chat.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `chatId`: The ID of the chat

**Response:**
```json
[
  {
    "_id": "string",
    "sender": {
      "_id": "string",
      "username": "string"
    },
    "recipient": {
      "_id": "string",
      "username": "string"
    },
    "content": "string",
    "timestamp": "date",
    "status": "string"
  }
]
```

## Socket.IO Events

### Server to Client Events

**user_connected**
- Emitted when a user connects to the server
- Data: `{ userId: string }`

**receive_message**
- Emitted when a new message is received
- Data: Message object

**message_sent**
- Emitted when a message is successfully sent and saved
- Data: `{ messageId: string, savedMessage: Message }`

**message_error**
- Emitted when there's an error sending a message
- Data: `{ messageId: string, error: string }`

**typing**
- Emitted when a user starts typing
- Data: `{ userId: string }`

**stop_typing**
- Emitted when a user stops typing
- Data: `{ userId: string }`

### Client to Server Events

**join_room**
- Joins a specific room
- Data: `{ room: string }`

**join_chat**
- Joins a specific chat
- Data: `{ chatId: string }`

**send_message**
- Sends a message
- Data: `{ room: string, senderId: string, recipientId: string, content: string, tempMessageId: string }`

**typing**
- Indicates user is typing
- Data: `{ userId: string }`

**stop_typing**
- Indicates user stopped typing
- Data: `{ userId: string }`

## Messages

### Send Message
**POST** `/api/messages/send`

Sends a message to a friend.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "recipientId": "string",
  "content": "string"
}
```

**Response:**
```json
{
  "_id": "string",
  "sender": {
    "_id": "string",
    "username": "string"
  },
  "recipient": {
    "_id": "string",
    "username": "string"
  },
  "content": "string",
  "timestamp": "date",
  "status": "string"
}
```

### Get Chat History
**GET** `/api/messages/history/{userId}`

Retrieves the chat history between the authenticated user and another user.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `userId`: The ID of the other user

**Response:**
```json
[
  {
    "_id": "string",
    "sender": {
      "_id": "string",
      "username": "string"
    },
    "recipient": {
      "_id": "string",
      "username": "string"
    },
    "content": "string",
    "timestamp": "date",
    "status": "string"
  }
]
```