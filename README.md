# Unified Real-Time Messaging Application

A secure, real-time messaging application built with Next.js 14, MongoDB, and Socket.io. Features end-to-end message encryption, JWT authentication with refresh tokens, rate limiting, and comprehensive security measures.

## Features

- **Real-time Messaging**: WebSocket-based instant messaging with Socket.io
- **Secure Authentication**: JWT tokens with automatic refresh and httpOnly cookies
- **Friend System**: Add friends, manage requests, search users
- **Message Encryption**: End-to-end encryption for message privacy
- **Rate Limiting**: Protection against brute force and DoS attacks
- **Account Lockout**: Automatic lockout after failed login attempts
- **Input Sanitization**: XSS protection on all user inputs
- **Security Headers**: CSP, HSTS, X-Frame-Options, and more
- **Database Indexing**: Optimized queries for better performance
- **Responsive UI**: Modern interface built with Tailwind CSS

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

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set the required variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/messaging_app

# JWT Authentication
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_secure_refresh_secret_minimum_32_characters

# Message Encryption
ENCRYPTION_KEY=your_32_character_encryption_key

# Environment
NODE_ENV=development

# Server
PORT=3000
```

**Generate secure secrets:**

```bash
# JWT Secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

4. **Set up MongoDB:**

**Option A: Local MongoDB**

```bash
# Install MongoDB (Windows)
# Download from https://www.mongodb.com/try/download/community

# Start MongoDB service
net start MongoDB

# Verify connection
mongosh
```

**Option B: MongoDB Atlas (Cloud)**

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string (replace `<password>` with your password)
4. Add your IP to whitelist (Network Access)
5. Update `MONGODB_URI` in `.env.local`

6. **Start development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Deployment

### Deploying to Vercel

1. **Prepare for deployment:**

```bash
# Ensure all environment variables are in .env.example (without values)
# Update next.config.js if needed
npm run build  # Test production build
```

2. **Deploy to Vercel:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

Or use the Vercel Dashboard:

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure environment variables
4. Deploy

5. **Set environment variables in Vercel:**

Go to Project Settings → Environment Variables and add:

- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Your JWT secret
- `JWT_REFRESH_SECRET` - Your refresh token secret
- `ENCRYPTION_KEY` - Your encryption key
- `NODE_ENV` - Set to `production`

4. **Configure custom server (if using Socket.io):**

**Note:** Vercel does not support WebSocket connections natively. For full Socket.io functionality, deploy to a platform that supports long-running processes.

### Alternative Deployment Options

#### Deploy to Railway

1. Create account at https://railway.app
2. Create new project from GitHub repo
3. Add environment variables
4. Deploy

**Advantages:**

- Supports WebSocket connections
- Automatic HTTPS
- Free tier available

#### Deploy to Render

1. Create account at https://render.com
2. Create new Web Service from GitHub
3. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables
5. Deploy

**Advantages:**

- Supports long-running processes
- Free tier with 750 hours/month
- Automatic HTTPS

#### Deploy to DigitalOcean App Platform

1. Create account at https://www.digitalocean.com
2. Create new app from GitHub
3. Configure build settings
4. Add environment variables
5. Deploy

### Database Deployment

**Production MongoDB Options:**

1. **MongoDB Atlas** (Recommended)
   - Free tier: 512 MB storage
   - Automatic backups
   - Global clusters
   - Built-in security

2. **Railway MongoDB**
   - Easy integration
   - Pay-as-you-go pricing

3. **Self-hosted**
   - Full control
   - Requires server management

### Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] CORS settings updated for production domain
- [ ] JWT secrets are strong (32+ characters)
- [ ] MongoDB whitelist includes deployment IPs
- [ ] HTTPS enabled
- [ ] Security headers verified
- [ ] Rate limiting active
- [ ] Error logging configured
- [ ] Backup strategy in place

## API Documentation

For complete API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### Quick Reference

### Authentication

- `POST /api/auth/register` - Register new user (Rate limit: 3/hour)
- `POST /api/auth/login` - User login (Rate limit: 5/15min)
- `GET /api/auth/profile` - Get user profile (Auth required)

### Friends

- `POST /api/friends/request` - Send friend request (Auth required)
- `POST /api/friends/request/accept` - Accept friend request (Auth required)
- `POST /api/friends/request/reject` - Reject friend request (Auth required)
- `GET /api/friends/requests` - Get pending requests (Auth required)
- `GET /api/friends/list` - Get friends list (Auth required)
- `GET /api/friends/search` - Search users (Auth required, Rate limit: 30/15min)

### Messages

- `POST /api/messages/send` - Send message (Auth required, Rate limit: 50/15min)
- `GET /api/messages/history/[userId]` - Get chat history (Auth required)

### Chats

- `POST /api/chats/get-or-create` - Get or create chat (Auth required)
- `GET /api/chats/[chatId]/messages` - Get chat messages (Auth required)

### Users

- `GET /api/users/me/chats` - Get user's chats (Auth required)
- `GET /api/users/[id]` - Get user by ID (Auth required)

## Technology Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes with custom Socket.io server
- **Database:** MongoDB with Mongoose ODM
- **Real-time:** Socket.io 4.8 with WebSocket support
- **Authentication:** JWT with access + refresh tokens
- **Security:** bcryptjs, input sanitization, rate limiting
- **Testing:** Jest with Supertest

## Development Commands

### Build for production:

```bash
npm run build      # Build Next.js application
npm start          # Start production server
```

### Run tests:

```bash
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Lint code:

```bash
npm run lint       # Check for linting errors
npm run lint:fix   # Auto-fix linting errors
```

### Database management:

```bash
# Connect to MongoDB shell
mongosh "mongodb://localhost:27017/messaging_app"

# View collections
show collections

# Query users
db.users.find()

# Clear test data
db.messages.deleteMany({})
```

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**

```bash
# Windows - Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm run dev
```

### MongoDB Connection Timeout

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solutions:**

1. Check if MongoDB service is running:

   ```bash
   # Windows
   net start MongoDB

   # Check status
   sc query MongoDB
   ```

2. Verify connection string in `.env.local`:

   ```env
   MONGODB_URI=mongodb://localhost:27017/messaging_app
   # Or for Atlas:
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
   ```

3. Check MongoDB is listening:
   ```bash
   mongosh --eval "db.adminCommand('ping')"
   ```

### JWT Token Errors

**Error:** `JsonWebTokenError: invalid token`

**Solutions:**

1. Clear browser cookies and localStorage
2. Verify `JWT_SECRET` in `.env.local` matches server
3. Check token expiration (default 1 hour for access tokens)
4. Ensure token is sent in Authorization header:
   ```
   Authorization: Bearer <token>
   ```

### Rate Limit Errors

**Error:** `429 Too Many Requests`

**Solutions:**

1. Wait for the rate limit window to expire
2. Check `retryAfter` field in response for wait time
3. For development, temporarily increase limits in:
   - [lib/middleware/rateLimiter.js](lib/middleware/rateLimiter.js)
   - Individual API routes

### Socket.io Connection Issues

**Error:** WebSocket connection failed

**Solutions:**

1. Ensure server is running: `npm run dev`
2. Check Socket.io URL in client matches server
3. Verify token is valid when connecting
4. Check browser console for CORS errors
5. For production, ensure hosting platform supports WebSockets

### Build Errors

**Error:** `Type error: Cannot find module`

**Solutions:**

1. Clear Next.js cache:

   ```bash
   rm -rf .next
   npm run build
   ```

2. Reinstall dependencies:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```

### Database Index Errors

**Error:** `MongoError: Index already exists with different options`

**Solutions:**

```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/messaging_app"

# Drop problematic indexes
db.messages.dropIndexes()

# Restart application to recreate indexes
```

### Environment Variables Not Loading

**Solutions:**

1. Ensure `.env.local` is in root directory (next to `package.json`)
2. Restart development server after changing `.env.local`
3. For client-side variables, use `NEXT_PUBLIC_` prefix
4. Check for typos in variable names
5. Verify `.env.example` for required variables

### Performance Issues

**Solutions:**

1. Add database indexes (already implemented in Message model)
2. Enable connection pooling (already configured)
3. Implement pagination for large data sets
4. Use caching for frequently accessed data
5. Check MongoDB query performance:
   ```bash
   db.messages.find({sender: "userId"}).explain("executionStats")
   ```

## Security Features

- **Password Security**: bcryptjs hashing with salt rounds, minimum 8 characters with complexity requirements
- **Message Encryption**: crypto-js AES encryption for message content
- **JWT Authentication**: Access tokens (1h) + refresh tokens (7d) with automatic rotation
- **httpOnly Cookies**: Refresh tokens stored in httpOnly cookies to prevent XSS
- **Rate Limiting**: IP-based rate limiting on authentication and messaging endpoints
- **Account Lockout**: 15-minute lockout after 5 failed login attempts
- **Input Sanitization**: HTML entity escaping on all user inputs
- **Security Headers**: CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **CORS Protection**: Configured for specific origins
- **Database Security**: Mongoose schema validation, connection retry logic

### Security Best Practices

1. **Never commit secrets**:

   ```bash
   # .env.local is in .gitignore
   # Use .env.example as a template
   ```

2. **Rotate JWT secrets** periodically in production

3. **Use strong passwords** for MongoDB in production

4. **Enable MongoDB authentication**:

   ```bash
   # Create admin user
   use admin
   db.createUser({
     user: "admin",
     pwd: "strongPassword",
     roles: ["root"]
   })
   ```

5. **Keep dependencies updated**:

   ```bash
   npm audit           # Check vulnerabilities
   npm audit fix       # Auto-fix vulnerabilities
   npm outdated        # Check for updates
   ```

6. **Monitor rate limits** and adjust based on usage patterns

7. **Review logs** for suspicious activity

## Documentation

- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Detailed implementation guide
- [SECURITY_GUIDE.md](SECURITY_GUIDE.md) - Security implementation reference
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Complete API reference
- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) - System architecture
- [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) - Testing checklist
- [00_START_HERE.md](00_START_HERE.md) - Quick start guide

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**

2. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Follow coding standards:**
   - Use TypeScript for frontend components
   - Use ES6+ JavaScript for backend
   - Follow ESLint rules
   - Add JSDoc comments for functions
   - Write tests for new features

4. **Commit with descriptive messages:**

   ```bash
   git commit -m "feat: add user profile picture upload"
   git commit -m "fix: resolve JWT token expiration issue"
   git commit -m "docs: update API documentation"
   ```

5. **Run tests before pushing:**

   ```bash
   npm test
   npm run lint
   ```

6. **Push to your branch:**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**:
   - Describe changes clearly
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure CI/CD passes

### Code Style

- Use Prettier for formatting
- Follow Airbnb JavaScript Style Guide
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Example:**

```
feat(auth): add two-factor authentication

- Implement TOTP-based 2FA
- Add QR code generation
- Update user model with 2FA fields

Closes #123
```

## Support & Resources

- **GitHub Issues**: Report bugs and request features
- **Documentation**: See `/docs` directory
- **Security Issues**: Email security@example.com (do not create public issues)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

ISC License

# Redesign Modern Messaging UI

This is a code bundle for Redesign Modern Messaging UI. The original project is available at https://www.figma.com/design/22WYLwk1XbQnB85oF4hzca/Redesign-Modern-Messaging-UI.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.
