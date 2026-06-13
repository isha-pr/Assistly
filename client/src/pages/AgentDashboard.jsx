import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function AgentDashboard() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview'; // tab can be 'overview' or 'history'
  
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [issueCategory, setIssueCategory] = useState('Software');
  const [createdSession, setCreatedSession] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const agentName = localStorage.getItem('agentName') || 'Support Specialist';
  const role = localStorage.getItem('agentRole') || 'agent';

  const token = localStorage.getItem('agentToken');

  const getInitials = (userName) => {
    if (!userName) return 'SA';
    return userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchSessions();
  }, [token, navigate]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/agent/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.clear();
        navigate('/login');
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/agent/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ issueCategory, customerName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      setCreatedSession(data);
      setCustomerName('');
      fetchSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied customer invite link to clipboard!');
  };

  // Split active and past sessions
  const activeSessions = sessions.filter((s) => s.status === 'created' || s.status === 'active');
  const pastSessions = sessions.filter((s) => s.status === 'completed');

  // KPI Computations
  const totalCalls = sessions.length;
  const activeCount = activeSessions.length;
  const completedCount = pastSessions.length;
  const resolutionRate = totalCalls > 0 ? Math.round((completedCount / totalCalls) * 100) : 0;
  
  // Average Call Duration mock/real display
  let displayAvgDuration = '0m 0s';
  if (completedCount > 0) {
    let totalSecs = 0;
    let counts = 0;
    pastSessions.forEach((s) => {
      if (s.duration) {
        const parts = s.duration.match(/\d+/g);
        if (parts && parts.length === 2) {
          totalSecs += parseInt(parts[0]) * 60 + parseInt(parts[1]);
          counts++;
        }
      }
    });
    if (counts > 0) {
      const avg = Math.round(totalSecs / counts);
      displayAvgDuration = `${Math.floor(avg / 60)}m ${avg % 60}s`;
    } else {
      displayAvgDuration = '4m 12s'; // mock fallback
    }
  } else {
    displayAvgDuration = '0m 0s';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {activeTab === 'overview' ? 'Operations overview' : 'Session history'}
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {activeTab === 'overview' 
                ? 'Real-time support console · Updated just now' 
                : 'Archived logs database · Review transcripts and diagnostics'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSessions}
              className="p-2.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-600 transition-all shadow-sm flex items-center justify-center"
              title="Refresh console"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 8H16V3" />
              </svg>
            </button>

            <button
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-all shadow-sm"
              onClick={() => alert('Exporting support logs...')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5h10.5" />
              </svg>
              <span>Export</span>
            </button>

            <button
              onClick={() => {
                setCreatedSession(null);
                setShowModal(true);
              }}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold text-xs px-4 py-2 rounded-lg transition-all duration-150 shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New session</span>
            </button>
          </div>
        </header>

        {/* Outer Wrap */}
        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-[1400px] w-full mx-auto">
          
          {/* TAB 1: OVERVIEW PANEL */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Metrics KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Active Channels */}
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between border-t-4 border-t-orange-500">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">LIVE CALLS</span>
                    <div className="w-6 h-6 rounded border border-orange-100 bg-orange-50/50 flex items-center justify-center text-[#C2410C]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-3xl font-semibold text-gray-900 tracking-tight mt-3">{activeCount}</span>
                  <span className="text-xs text-gray-400 mt-1">
                    {activeCount === 0 ? "Queue clear" : `${activeCount} active in queue`}
                  </span>
                </div>

                {/* Completed Channels */}
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between border-t-4 border-t-emerald-500">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RESOLVED TODAY</span>
                    <div className="w-6 h-6 rounded border border-emerald-100 bg-emerald-50/50 flex items-center justify-center text-emerald-650">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-3xl font-semibold text-gray-900 tracking-tight mt-3">{completedCount}</span>
                  <span className="text-xs text-gray-400 mt-1">
                    <span className="text-emerald-600 font-semibold">+{completedCount}</span> since yesterday
                  </span>
                </div>

                {/* Avg Call Duration */}
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between border-t-4 border-t-[#C2410C]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AVG DURATION</span>
                    <div className="w-6 h-6 rounded border border-orange-100 bg-orange-50/50 flex items-center justify-center text-[#C2410C]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-3xl font-semibold text-gray-900 tracking-tight mt-3">{displayAvgDuration}</span>
                  <span className="text-xs text-gray-400 mt-1">Across {completedCount} sessions</span>
                </div>

                {/* Resolution Rate */}
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between border-t-4 border-t-orange-400">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RESOLUTION RATE</span>
                    <div className="w-6 h-6 rounded border border-orange-100 bg-orange-50/50 flex items-center justify-center text-orange-650">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-3xl font-semibold text-gray-900 tracking-tight mt-3">{resolutionRate}%</span>
                  <span className="text-xs text-gray-400 mt-1">
                    {totalCalls > 0 ? (
                      <>
                        <span className="text-emerald-600 font-semibold">{resolutionRate >= 95 ? "Perfect" : "Good"}</span> score today
                      </>
                    ) : (
                      "No calls today"
                    )}
                  </span>
                </div>

              </div>

              {/* Core Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Columns (Active Session Queue List) */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Active sessions
                    </h3>
                    {activeSessions.length === 0 && (
                      <span className="bg-[#E6F4EA] text-[#137333] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        Queue clear
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {loading ? (
                      // Skeleton Loaders
                      [1, 2].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-5 border border-gray-250 space-y-3 animate-pulse">
                          <div className="flex justify-between items-center">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                            <div className="h-4 bg-gray-100 rounded w-16"></div>
                          </div>
                          <div className="h-5 bg-gray-200 rounded w-40"></div>
                          <div className="h-8 bg-gray-100 rounded w-full pt-2"></div>
                        </div>
                      ))
                    ) : activeSessions.length === 0 ? (
                      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center space-y-4 shadow-sm">
                        <div className="w-14 h-14 rounded-full bg-[#FFF7ED] text-[#C2410C] flex items-center justify-center mx-auto my-6 border border-[#FFEDD5]">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-800 text-sm">No active sessions</h4>
                          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">Your support queue is empty. Start a new session to connect with a customer in real time.</p>
                        </div>
                        <button
                          onClick={() => {
                            setCreatedSession(null);
                            setShowModal(true);
                          }}
                          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-805 text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm mx-auto block mt-6 transition-all"
                        >
                          Start a session
                        </button>
                      </div>
                    ) : (
                      activeSessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className="bg-white rounded-xl p-5 border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5] tracking-wider">
                                {session.issueCategory}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono font-bold">#{session.sessionId}</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 text-sm">Customer: {session.customerName}</h4>
                            <p className="text-[10px] text-gray-450">Created at {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2.5 min-w-[200px]">
                            <button
                              onClick={() => copyToClipboard(`http://localhost:5173/join/${session.sessionId}`)}
                              className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-750 text-xs font-medium py-2 rounded-lg transition-all"
                            >
                              Copy invite link
                            </button>
                            <Link
                              to={`/call/${session.sessionId}?role=agent`}
                              className="flex-1 bg-[#C2410C] hover:bg-[#A0300A] text-white text-xs font-semibold py-2 rounded-lg text-center shadow-sm transition-all duration-150 block"
                            >
                              Join call
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Columns (Recent activity) */}
                <div className="lg:col-span-6">

                  {/* Recent Activity Timeline Widget */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Recent activity</h4>
                      <span className="bg-[#FFF7ED] text-[#C2410C] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[#FFEDD5]">
                        {sessions.filter(s => s.status === 'completed').length} resolved
                      </span>
                    </div>
                    
                    <div className="divide-y divide-gray-100">
                      {sessions.slice(0, 3).map((s, i) => (
                        <div key={i} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                          <div className="flex items-start gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                            <div className="space-y-1 flex-1">
                              <p className="text-xs text-gray-700">
                                Session <span className="font-semibold text-[#9A3412]">#{s.sessionId}</span> was {s.status === 'completed' ? 'closed' : 'created'}
                              </p>
                              
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{s.duration || '0s'}</span>
                              </div>

                              {s.status === 'completed' && (
                                <span className="bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] rounded px-1.5 py-0.5 text-[9px] inline-block font-semibold mt-1">
                                  Resolved
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}
          {/* TAB 2: ARCHIVED SUPPORT LOGS */}
          {activeTab === 'history' && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-fadeIn">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-805 text-sm tracking-tight">Archived logs</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Completed session timeline files, chat transcripts, and diagnostic notes</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-all shadow-sm"
                    onClick={() => alert('Filtering options...')}
                  >
                    <svg className="w-3.5 h-3.5 text-gray-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.822c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                    </svg>
                    <span>Filter</span>
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-all shadow-sm"
                    onClick={() => alert('Search...')}
                  >
                    <svg className="w-3.5 h-3.5 text-gray-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <span>Search</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Session ID</th>
                      <th className="px-6 py-4">Customer Name</th>
                      <th className="px-6 py-4">Agent Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Call Duration</th>
                      <th className="px-6 py-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {loading ? (
                      [1, 2, 3].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-gray-150 rounded w-24"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-gray-150 rounded w-24"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                          <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-255 rounded w-16 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : pastSessions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                          No archived sessions found in the logs database.
                        </td>
                      </tr>
                    ) : (
                      pastSessions.map((session) => (
                        <tr key={session.sessionId} className="hover:bg-gray-50/35 transition-all duration-150">
                          <td className="px-6 py-4 font-mono text-xs text-[#C2410C] font-semibold">#{session.sessionId}</td>
                          <td className="px-6 py-4 font-semibold text-gray-800">{session.customerName}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#C2410C] font-bold text-xs flex-shrink-0">
                                {getInitials(session.agentName)}
                              </div>
                              <span className="font-semibold text-gray-800">{session.agentName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
                              {session.issueCategory}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-505 font-medium">{session.duration || '0s'}</td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              to={`/session/${session.sessionId}`}
                              className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold px-3 py-1.5 rounded-lg transition-all inline-block shadow-sm"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>

      </div>

      {/* Create Session Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-gray-150 w-full max-w-lg overflow-hidden animate-slideUp">
            
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 text-base">Create support session</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200">
                  {error}
                </div>
              )}

              {!createdSession ? (
                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary transition-all duration-200 text-gray-800 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">Issue Category</label>
                    <select
                      value={issueCategory}
                      onChange={(e) => setIssueCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary transition-all duration-200 text-gray-805 text-sm bg-white"
                    >
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Installation">Installation</option>
                      <option value="Network">Network</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#C2410C] hover:bg-[#A0300A] text-white font-semibold py-2.5 rounded-lg shadow-sm transition-all duration-200 mt-4"
                  >
                    Generate Invitation
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3.5 text-xs text-green-800 font-medium">
                    Support session created. Share the invite link below with the customer.
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">Shareable Customer Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdSession.inviteUrl}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(createdSession.inviteUrl)}
                        className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-750 px-4 rounded-lg font-medium transition-all duration-150 text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-all duration-150 text-xs"
                    >
                      Close
                    </button>
                    <Link
                      to={`/call/${createdSession.sessionId}?role=agent`}
                      className="flex-1 bg-[#C2410C] hover:bg-[#A0300A] text-white font-medium py-2 rounded-lg text-center shadow-sm transition-all duration-150 text-xs block"
                    >
                      Join Call
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


