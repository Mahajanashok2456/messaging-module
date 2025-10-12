# Connect - Real-time Messaging Application

A modern real-time messaging application built with React, Node.js, and Socket.IO.

## Features

- Real-time messaging with Socket.IO
- User authentication and authorization
- Friend requests and management
- Encrypted message storage
- Responsive UI with modern design
- Chat history persistence

## Tech Stack

### Frontend
- React with TypeScript
- React Router for navigation
- Context API for state management
- Tailwind CSS for styling
- Socket.IO client for real-time communication

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication
- CryptoJS for message encryption

## Project Structure

```
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── utils/
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   └── utils/
    └── public/
```

## Setup Instructions

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
4. Set up environment variables (see `.env.example`)
5. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```
6. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License.