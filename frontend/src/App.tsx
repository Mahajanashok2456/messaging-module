import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Chat from './components/Chat';
import TestConnection from './TestConnection';
import TestAuth from './TestAuth';
import DebugAuth from './DebugAuth';
import TestLoginFlow from './TestLoginFlow';
import AuthDebug from './AuthDebug';
import TestCompleteAuthFlow from './TestCompleteAuthFlow';
import './App.css';

// Create a wrapper component for Chat that handles routing
const ChatWrapper = () => {
  return <Chat />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />
            <Route path="/chat/:friendId" element={<ChatWrapper />} />
            <Route path="/test" element={<TestConnection />} />
            <Route path="/test-auth" element={<TestAuth />} />
            <Route path="/debug-auth" element={<DebugAuth />} />
            <Route path="/test-login" element={<TestLoginFlow />} />
            <Route path="/auth-debug" element={<AuthDebug />} />
            <Route path="/test-complete-auth" element={<TestCompleteAuthFlow />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;