# Unified Real-Time Messaging Application

A single Next.js application combining frontend and backend into one unified codebase.

## Project Structure

```
app/
├── api/                    # Next.js API Routes
│   ├── auth/              # Authentication endpoints
│   │   ├── register/      # POST /api/auth/register
│   │   ├── login/         # POST /api/auth/login
│   │   └── profile/       # GET /api/auth/profile
│   ├── friends/           # Friend management endpoints
│   │   ├── request/       # POST /api/friends/request
│   │   ├── requests/      # GET /api/friends/requests
│   │   ├── list/          # GET /api/friends/list
│   │   └── search/        # GET /api/friends/search
│   ├── messages/          # Messaging endpoints
│   │   ├── send/          # POST /api/messages/send
│   │   └── history/       # GET /api/messages/history/[userId]
│   ├── chats/             # Chat endpoints
│   │   ├── get-or-create/ # POST /api/chats/get-or-create
│   │   └── [chatId]/      # GET /api/chats/[chatId]/messages
│   ├── users/             # User endpoints
│   │   ├── me/            # GET /api/users/me/chats
│   │   └── [id]/          # GET /api/users/[id]
│   └── notifications/     # Notification service
├── chat/                  # Chat page
├── login/                 # Login page
├── register/              # Register page
├── page.tsx               # Home page
├── layout.tsx             # Root layout
└── globals.css            # Global styles
components/
├── ChatArea.tsx           # Chat messaging component
└── Sidebar.tsx            # Sidebar navigation
lib/
├── api.ts                 # Axios API client
├── socket.ts              # Socket.io client
├── db/                    # Database models and config
│   ├── User.js            # User schema
│   ├── Message.js         # Message schema
│   ├── Chat.js            # Chat schema
│   └── db.js              # MongoDB connection
├── utils/                 # Utilities
│   ├── AppError.js        # Custom error class
│   └── encryption.js      # Message encryption/decryption
└── middleware/            # Middleware functions
    ├── authNext.js        # Next.js auth middleware
    └── errorHandler.js    # Error handling
public/                    # Static assets
tests/                     # Test files
```

## Setup & Installation

1. **Clone the repository:**

```bash
git clone <repository-url>
cd mess
```

2. **Install dependencies:**

```bash
npm install
```

3. **Configure environment variables:**

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `ENCRYPTION_KEY` - Key for message encryption

4. **Start development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Friends

- `POST /api/friends/request` - Send friend request
- `PUT /api/friends/request/accept` - Accept friend request
- `PUT /api/friends/request/reject` - Reject friend request
- `GET /api/friends/requests` - Get pending requests
- `GET /api/friends/list` - Get friends list
- `GET /api/friends/search` - Search users

### Messages

- `POST /api/messages/send` - Send message
- `GET /api/messages/history/[userId]` - Get chat history

### Chats

- `POST /api/chats/get-or-create` - Get or create chat
- `GET /api/chats/[chatId]/messages` - Get chat messages

### Users

- `GET /api/users/me/chats` - Get user's chats
- `GET /api/users/[id]` - Get user by ID

## Features

- ✅ User authentication with JWT
- ✅ Friend management system
- ✅ Real-time messaging with Socket.io
- ✅ Message encryption
- ✅ Chat history
- ✅ Friend requests
- ✅ User search
- ✅ Responsive UI with Tailwind CSS

## Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Express.js (integrated)
- **Database:** MongoDB with Mongoose
- **Real-time:** Socket.io
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** bcryptjs, crypto-js, CORS, Rate Limiting

## Development

### Build for production:

```bash
npm run build
npm start
```

### Run tests:

```bash
npm test
```

### Lint code:

```bash
npm run lint
```

## Security Features

- Password hashing with bcryptjs
- Message encryption with crypto-js
- JWT-based authentication
- CORS protection
- Rate limiting
- Input sanitization

## Environment Variables

```
MONGO_URI=mongodb://localhost:27017/messaging_app
JWT_SECRET=your_secret_key
ENCRYPTION_KEY=your_encryption_key
PORT=3000
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## Contributing

1. Create a feature branch
2. Commit your changes
3. Push to the branch
4. Create a Pull Request

## License

ISC License

# Redesign Modern Messaging UI

This is a code bundle for Redesign Modern Messaging UI. The original project is available at https://www.figma.com/design/22WYLwk1XbQnB85oF4hzca/Redesign-Modern-Messaging-UI.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.
