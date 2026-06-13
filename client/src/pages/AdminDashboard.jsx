import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('agentToken');
  const role = localStorage.getItem('agentRole') || 'agent';

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Check if role is admin - Access Control Verification
    if (role !== 'admin') {
      setError('Access Denied. You must be signed in as a System Administrator to view this console.');
      setLoading(false);
      return;
    }

    fetchMetrics();
  }, [token, role, navigate]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://65.2.35.4:3001/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load system metrics.');
      }
      
      setMetrics(data.metrics);
      setLogs(data.sessionLogs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceEnd = async (sessionId) => {
    if (!window.confirm(`⚠️ CRITICAL: Are you sure you want to FORCE TERMINATE active support session #${sessionId}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://65.2.35.4:3001/api/agent/sessions/end/${sessionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        alert(`Session #${sessionId} was forcefully closed.`);
        fetchMetrics();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-red-100 p-8 text-center space-y-6">
          <div className="text-5xl">🔒</div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-800">Admin Clearance Required</h2>
            <p className="text-gray-500 text-sm">{error || 'You do not have permission to view administrative reports.'}</p>
          </div>
          <Link to="/dashboard" className="block w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl text-center shadow-md transition-all">
            Return to Agent Workspace
          </Link>
        </div>
      </div>
    );
  }

  const getInitials = (userName) => {
    if (!userName) return 'SA';
    return userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 font-medium text-sm">Loading admin metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar activeTab="admin" />

      <div className="flex-1 flex flex-col min-w-0">
        
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">System administration panel</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Platform performance analytics & session controls</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex border border-gray-200 rounded-lg p-0.5 bg-gray-50/50">
              <button
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]"
                onClick={() => navigate('/admin')}
              >
                Admin panel
              </button>
              <button
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-gray-500 hover:text-gray-900 transition-all"
                onClick={() => navigate('/dashboard?tab=history')}
              >
                Session history
              </button>
            </div>

            <button
              onClick={fetchMetrics}
              className="p-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-500 transition-all shadow-sm flex items-center justify-center"
              title="Refresh console"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 8H16V3" />
              </svg>
            </button>

            <button
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-all shadow-sm"
              onClick={() => alert('Exporting dashboard metrics...')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5h10.5" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-[1400px] w-full mx-auto animate-fadeIn">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between border-t-4 border-t-orange-400 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">LIVE SESSIONS</span>
                <div className="w-6 h-6 rounded border border-orange-100 bg-orange-50/50 flex items-center justify-center text-[#C2410C]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <span className="text-3xl font-semibold text-gray-900 tracking-tight mt-3">{metrics?.activeSessions || 0}</span>
              <span className="text-xs text-gray-400 mt-1">
                {metrics?.activeSessions === 0 ? 'Queue idle' : `${metrics.activeSessions} active`}
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between border-t-4 border-t-blue-400 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CONNECTED PARTICIPANTS</span>
                <div className="w-6 h-6 rounded border border-blue-100 bg-blue-50/50 flex items-center justify-center text-blue-650">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20c-2.202 0-4.277-.622-6.043-1.702m16.033-2.128c.812-.031 1.625-.098 2.433-.203M11.162 4.487A4.487 4.487 0 118.25 9.75M16.5 9.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                </div>
              </div>
              <span className="text-3xl font-semibold text-gray-900 tracking-tight mt-3">{metrics?.activeParticipants || 0}</span>
              <span className="text-xs text-gray-400 mt-1">
                {metrics?.activeParticipants === 0 ? 'No active calls' : `${metrics.activeParticipants} active`}
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between border-t-4 border-t-emerald-400 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TOTAL SESSIONS</span>
                <div className="w-6 h-6 rounded border border-emerald-100 bg-emerald-50/50 flex items-center justify-center text-emerald-650">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </div>
              </div>
              <span className="text-3xl font-semibold text-gray-900 tracking-tight mt-3">{metrics?.totalSessions || 0}</span>
              <span className="text-xs text-emerald-600 font-semibold mt-1">
                {metrics?.totalSessions > 0 ? '100% resolved' : 'No sessions today'}
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between border-t-4 border-t-red-400 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AVG CALL DURATION</span>
                <div className="w-6 h-6 rounded border border-red-100 bg-red-50/50 flex items-center justify-center text-red-650">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <span className="text-3xl font-semibold text-gray-900 tracking-tight mt-3">{metrics?.avgDuration || '0m 0s'}</span>
              <span className="text-xs text-gray-400 mt-1">Across {metrics?.totalSessions || 0} sessions</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-950 text-sm tracking-tight">Issue distribution</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Breakdown by category across all sessions</p>
                </div>
                <span className="bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5] px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {logs.length} total
                </span>
              </div>
              
              <div className="space-y-4 text-xs font-semibold">
                {(() => {
                  const categoriesToRender = ['Software', 'Hardware', 'Installation', 'Network', 'Other'];
                  const counts = { Software: 0, Hardware: 0, Installation: 0, Network: 0, Other: 0 };
                  
                  logs.forEach(l => {
                    const cat = l.issueCategory || 'Software';
                    if (counts[cat] !== undefined) {
                      counts[cat] += 1;
                    } else {
                      counts['Other'] += 1;
                    }
                  });

                  return categoriesToRender.map((cat) => {
                    const count = counts[cat] || 0;
                    const pct = logs.length > 0 ? Math.round((count / logs.length) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between text-gray-500 text-xs">
                          <span className="font-semibold text-gray-700">{cat}</span>
                          <span className="text-gray-400 font-medium">{count} sessions · {pct}%</span>
                        </div>
                        <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#C2410C] h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-sm tracking-tight">Master session activity log</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">All sessions with agent, customer, and resolution data</p>
              </div>
              
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-all shadow-sm"
                onClick={() => alert('Filtering options...')}
              >
                <svg className="w-3.5 h-3.5 text-gray-505" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.822c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                <span>Filter</span>
              </button>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Session ID</th>
                      <th className="px-6 py-4">Agent</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-750">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-450">
                          No session history logs logged.
                        </td>
                      </tr>
                    ) : (
                      logs.map((session) => {
                        const isActive = session.status === 'created' || session.status === 'active';
                        return (
                          <tr key={session.sessionId} className="hover:bg-gray-50/35 transition-all duration-150">
                            <td className="px-6 py-4 font-mono text-xs text-[#C2410C] font-semibold">#{session.sessionId}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#C2410C] font-bold text-xs flex-shrink-0">
                                  {getInitials(session.agentName)}
                                </div>
                                <span className="font-semibold text-gray-800">{session.agentName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-800">{session.customerName}</td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
                                {session.issueCategory}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  session.status === 'completed'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : session.status === 'active'
                                    ? 'bg-orange-50 text-primary border-orange-100 animate-pulse'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {session.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 font-semibold">{session.duration || '0s'}</td>
                            <td className="px-6 py-4 text-right flex gap-2.5 justify-end">
                              {isActive && (
                                <button
                                  onClick={() => handleForceEnd(session.sessionId)}
                                  className="text-xs bg-white hover:bg-red-50 text-red-650 border border-red-150 font-medium px-2.5 py-1.5 rounded-lg transition-all"
                                >
                                  Terminate
                                </button>
                              )}
                              <Link
                                  to={`/session/${session.sessionId}`}
                                  className="text-xs bg-white hover:bg-gray-50 text-gray-750 border border-gray-200 font-semibold px-2.5 py-1.5 rounded-lg transition-all inline-block shadow-sm"
                                >
                                  Audit File
                                </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </main>
      </div>

    </div>
  );
}
