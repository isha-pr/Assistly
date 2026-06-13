import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function SessionDetails() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState('');

  // Form notes state
  const [issueDescription, setIssueDescription] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolution, setResolution] = useState('');
  const [followUp, setFollowUp] = useState('');

  // Recording State
  const [recordingFile, setRecordingFile] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);

  const token = localStorage.getItem('agentToken');

  const handleRecordingUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRecordingFile(file);
    const url = URL.createObjectURL(file);
    setRecordingUrl(url);
  };

  useEffect(() => {
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [recordingUrl]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDetails();
  }, [sessionId, token, navigate]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`https://assistly-p527.onrender.com/api/agent/sessions/details/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to load session details.');
      }
      
      setData(resData);
      if (resData.note) {
        setIssueDescription(resData.note.issueDescription || '');
        setRootCause(resData.note.rootCause || '');
        setResolution(resData.note.resolution || '');
        setFollowUp(resData.note.followUp || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    setSavingNotes(true);

    try {
      const response = await fetch(`https://assistly-p527.onrender.com/api/agent/sessions/notes/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          issueDescription,
          rootCause,
          resolution,
          followUp,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to save notes.');
      }

      alert('Notes saved successfully!');
    } catch (err) {
      alert(`Error saving notes: ${err.message}`);
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 font-medium text-sm">Loading session history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-red-100 p-8 text-center space-y-6">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800">Error Loading Session</h2>
          <p className="text-gray-500 text-sm">{error}</p>
          <Link to="/dashboard" className="block w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl text-center shadow-md transition-all">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { session, participants = [], messages = [] } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 transition-all font-semibold">
            ← Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-800">Session Review</span>
          <span className="text-xs bg-orange-100 text-orange-700 font-bold border border-orange-200 px-2.5 py-0.5 rounded-full uppercase">
            {session.issueCategory}
          </span>
        </div>
        <div className="text-xs font-mono bg-gray-100 px-3 py-1 rounded text-gray-500 font-bold">
          Session ID: {sessionId}
        </div>
      </nav>

      {/* Main Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Columns: Recording, Info, Timeline & Chat */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Recording Player & Download Panel */}
          <div className="bg-white rounded-2xl shadow-soft border border-orange-100 p-6 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <span>🎥</span> Call Recording Playback
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Play back or download the recorded call audio and video feed</p>
              </div>
              <div className="flex gap-2">
                {recordingUrl ? (
                  <>
                    <a
                      href={recordingUrl}
                      download={`AssistLy-Recording-${sessionId}.webm`}
                      className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <span>📥</span> Download Recording
                    </a>
                    <button
                      onClick={() => {
                        setRecordingUrl(null);
                        setRecordingFile(null);
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-gray-200"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer bg-orange-50 hover:bg-orange-100 text-primary border border-orange-200 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
                    <span>📤</span> Upload WebM Recording
                    <input
                      type="file"
                      accept="video/webm,video/*"
                      className="hidden"
                      onChange={handleRecordingUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            {recordingUrl ? (
              <div className="rounded-xl overflow-hidden bg-black border border-gray-200 aspect-video max-h-[350px] w-full flex items-center justify-center relative shadow-inner">
                <video
                  src={recordingUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center space-y-3 bg-gray-50/50 hover:bg-gray-50 transition-all flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-primary text-xl">
                  📁
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-700">No active recording loaded in this workspace</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    To review the call, select the locally downloaded WebM file generated during the session.
                  </p>
                </div>
                <label className="cursor-pointer inline-flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-250 text-gray-750 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
                  Choose Recording File
                  <input
                    type="file"
                    accept="video/webm,video/*"
                    className="hidden"
                    onChange={handleRecordingUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Metadata Card */}
          <div className="bg-white rounded-2xl shadow-soft border border-orange-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">Session Metadata</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs font-semibold">Customer</p>
                <p className="font-bold text-gray-800 mt-1">{session.customerName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Agent</p>
                <p className="font-bold text-gray-800 mt-1">{session.agentName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Duration</p>
                <p className="font-bold text-gray-800 mt-1">{session.duration || '0s'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Status</p>
                <span className="inline-block px-2.5 py-0.5 mt-1 text-xs font-bold bg-green-100 text-green-700 rounded-full border border-green-200 uppercase">
                  {session.status}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline View (Join/Leave events) */}
          <div className="bg-white rounded-2xl shadow-soft border border-orange-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">Activity Timeline</h3>
            
            {participants.length === 0 ? (
              <p className="text-gray-400 text-sm">No activity logs recorded.</p>
            ) : (
              <div className="relative pl-8 border-l-2 border-orange-100 space-y-6 text-sm">
                {participants.map((p, idx) => (
                  <div key={idx} className="relative pb-2 last:pb-0">
                    {/* Glowing node badge */}
                    <div className={`absolute -left-[41px] top-1.5 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${
                      p.role === 'agent' ? 'bg-primary' : 'bg-blue-500'
                    }`}></div>
                    
                    <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 space-y-2 hover:bg-gray-50 transition-all shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                            p.role === 'agent' ? 'bg-orange-50 text-primary border border-orange-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {p.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono font-bold">
                          {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-600 font-semibold flex items-center gap-1.5">
                        <span className="text-green-500 text-sm">🟢</span>
                        Joined the session
                      </div>

                      {p.leftAt && (
                        <div className="pt-2 border-t border-gray-150 flex justify-between items-center text-xs">
                          <span className="text-gray-550 font-semibold flex items-center gap-1.5">
                            <span className="text-red-400 text-sm">🔴</span> Left the session
                          </span>
                          <span className="font-mono text-[10px] text-gray-405 font-bold">
                            {new Date(p.leftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Logs */}
          <div className="bg-white rounded-2xl shadow-soft border border-orange-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3">Chat Transcripts</h3>
            
            {messages.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm font-semibold">
                No chat messages were sent during this session.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {messages.map((msg, idx) => {
                  const isAgent = msg.sender === session.agentName;
                  const isImage = msg.fileUrl && /\.(jpeg|jpg|gif|png|webp)$/i.test(msg.fileName);
                  return (
                    <div key={idx} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'} space-y-1`}>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 px-1">
                        <span>{msg.sender}</span>
                        <span>•</span>
                        <span className="font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                          isAgent
                            ? 'bg-orange-50 text-gray-800 border-orange-100/70 rounded-tr-none'
                            : 'bg-white text-gray-700 border-gray-200/60 rounded-tl-none'
                        }`}
                      >
                        {msg.fileUrl ? (
                          <div className="flex flex-col gap-2.5">
                            {isImage ? (
                              <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-xl max-h-40 object-cover border border-gray-200/50" />
                            ) : (
                              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <span className="text-xl">📄</span>
                                <span className="font-bold text-xs truncate max-w-[180px] text-gray-700">{msg.fileName}</span>
                              </div>
                            )}
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:text-primary-dark font-black flex items-center gap-1 transition-all"
                            >
                              <span>📥</span> Download Attachment
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm font-medium">{msg.message}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Agent Support Notes */}
        <div className="lg:col-span-5">
          <form onSubmit={handleSaveNotes} className="bg-white rounded-2xl shadow-soft border border-orange-100 p-6 space-y-6 sticky top-6">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Support Issue Notes</h3>
              <button
                type="submit"
                disabled={savingNotes}
                className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-sm">📋</span> Issue Description
                </label>
                <textarea
                  rows="3"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe the problem customer faced..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent text-sm text-gray-700 placeholder-gray-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-sm">🔍</span> Root Cause Analysis
                </label>
                <textarea
                  rows="3"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Identify what caused the issue..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent text-sm text-gray-700 placeholder-gray-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-sm">✅</span> Resolution Path
                </label>
                <textarea
                  rows="3"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Explain the solution applied..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent text-sm text-gray-700 placeholder-gray-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-sm">➡️</span> Follow-up Steps
                </label>
                <textarea
                  rows="2"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="Note any next steps or follow-ups needed..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent text-sm text-gray-700 placeholder-gray-400 shadow-sm"
                />
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
