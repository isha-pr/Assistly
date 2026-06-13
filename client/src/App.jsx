import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import AgentLogin from './pages/AgentLogin';
import AgentDashboard from './pages/AgentDashboard';
import CustomerJoin from './pages/CustomerJoin';
import CallInterface from './pages/CallInterface';
import SessionDetails from './pages/SessionDetails';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/login" element={<AgentLogin />} />
          <Route path="/dashboard" element={<AgentDashboard />} />
          <Route path="/join/:sessionId" element={<CustomerJoin />} />
          <Route path="/call/:sessionId" element={<CallInterface />} />
          <Route path="/session/:sessionId" element={<SessionDetails />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
