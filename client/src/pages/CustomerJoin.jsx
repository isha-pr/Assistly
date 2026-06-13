import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function CustomerJoin() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    validateSession();
  }, [sessionId]);

  const validateSession = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/api/sessions/validate/${sessionId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired support session link.');
      }
      
      setSessionDetails(data);
      if (data.customerName) {
        setName(data.customerName);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Navigate to the video call screen
    navigate(`/call/${sessionId}?role=customer&name=${encodeURIComponent(name.trim())}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50/50 p-4">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 font-medium text-sm">Validating invitation link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50/50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-red-100 overflow-hidden text-center p-8 space-y-6">
          <div className="text-5xl">⚠️</div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-800">Invalid Invitation</h2>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-all duration-150"
          >
            Go to Portal Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-orange-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="bg-gradient-to-r from-primary to-primary-dark p-8 text-center text-white">
          <div className="flex justify-center items-center gap-3 mb-2">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.122-4.1-6.922-6.922l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <h1 className="text-2xl font-bold tracking-tight">AssistLy</h1>
          </div>
          <p className="text-orange-100 text-sm font-medium">Remote Customer Support Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-gray-800">Join Support Session</h2>
            <p className="text-xs text-gray-400 font-medium">Session ID: {sessionId}</p>
          </div>

          {/* Session Info Details Card */}
          <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-400">Assigned Agent:</span>
              <span className="text-gray-700">{sessionDetails?.agentName}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-400">Issue Category:</span>
              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-bold uppercase text-[10px]">
                {sessionDetails?.issueCategory}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-gray-800"
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Join Support Call
          </button>
        </form>
      </div>
    </div>
  );
}
