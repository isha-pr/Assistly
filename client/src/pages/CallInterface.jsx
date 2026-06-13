import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

export default function CallInterface() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const role = searchParams.get('role') || 'customer';
  const name = searchParams.get('name') || (role === 'agent' ? 'Support Agent' : 'Customer');

  const {
    socket,
    joined,
    connecting,
    localStream,
    remoteStream,
    micActive,
    camActive,
    errorMsg,
    permissionDenied,
    joinCall,
    toggleMic,
    toggleCam,
    leaveCall,
    peers,
  } = useSocket();

  // Video elements refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Chat state
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const chatEndRef = useRef(null);

  // Session info
  const [sessionInfo, setSessionInfo] = useState(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Live session duration timer
  const [durationSeconds, setDurationSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (joined) {
      interval = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setDurationSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [joined]);

  const formatDuration = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0'),
    ].filter(Boolean).join(':');
  };

  // Join call on mount
  useEffect(() => {
    joinCall(sessionId, name, role);
    fetchSessionDetails();

    return () => {
      leaveCall();
    };
  }, [sessionId]);

  // Assign local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Assign remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Fetch session details from backend
  const fetchSessionDetails = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/validate/${sessionId}`);
      const data = await response.json();
      if (response.ok) {
        setSessionInfo(data);
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  // Socket chat listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('new-message', (msg) => {
      setChatLog((prev) => [...prev, msg]);
    });

    socket.on('call-ended', () => {
      alert('The support session has been ended by the agent.');
      leaveCall();
      navigate('/login');
    });

    return () => {
      socket.off('new-message');
      socket.off('call-ended');
    };
  }, [socket]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socket) return;

    const chatMsg = {
      sessionId,
      sender: name,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // Emit message to backend
    socket.emit('send-message', chatMsg);
    
    // Append locally
    setChatLog((prev) => [...prev, chatMsg]);
    setMessage('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !socket) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/sessions/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        const chatMsg = {
          sessionId,
          sender: name,
          message: `📎 Shared file: ${data.fileName}`,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          timestamp: new Date().toISOString(),
        };
        // Emit file details to backend
        socket.emit('send-message', chatMsg);
        setChatLog((prev) => [...prev, chatMsg]);
      } else {
        alert('File upload failed: ' + (data.error || 'unknown error'));
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('File upload failed.');
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    const streamToRecord = new MediaStream();
    
    // Add remote tracks
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        streamToRecord.addTrack(track);
      });
    } else if (localStream) {
      localStream.getTracks().forEach((track) => {
        streamToRecord.addTrack(track);
      });
    }

    // Add local audio track so agent voice is captured
    if (localStream && remoteStream) {
      localStream.getAudioTracks().forEach((track) => {
        streamToRecord.addTrack(track);
      });
    }

    if (streamToRecord.getTracks().length === 0) {
      alert('No media streams available to record.');
      return;
    }

    recordedChunksRef.current = [];
    let options = { mimeType: 'video/webm;codecs=vp8,opus' };
    
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }

    try {
      const recorder = new MediaRecorder(streamToRecord, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `AssistLy-Recording-${sessionId}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start(1000);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Failed to start recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped');
    }
  };

  const handleLeave = async () => {
    stopRecording();
    if (role === 'agent') {
      try {
        await fetch(`http://localhost:3001/api/agent/sessions/end/${sessionId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('agentToken')}` },
        });
      } catch (err) {
        console.error('Failed to end session on server:', err);
      }
    }
    leaveCall();
    if (role === 'agent') {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col text-white overflow-hidden">
      
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 shadow-md">
        {/* Left: Branding & Category */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.122-4.1-6.922-6.922l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          <div>
            <h1 className="font-bold tracking-tight text-gray-100 flex items-center gap-2 text-base">
              AssistLy
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-900 border border-gray-750 px-2 py-0.5 rounded">
                Live Support
              </span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium">Video-Assisted Customer Support</p>
          </div>
          <span className="ml-2 px-2.5 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
            {sessionInfo?.issueCategory || 'Loading...'}
          </span>
        </div>

        {/* Center: Live Call details (Customer name, Agent name, Running Timer) */}
        <div className="flex flex-wrap items-center justify-center gap-4 bg-gray-900/60 px-5 py-2 rounded-xl border border-gray-750 text-xs text-gray-300 font-semibold max-w-lg">
          <div className="flex items-center gap-1.5 border-r border-gray-750 pr-4">
            <span className="text-gray-450">Customer:</span>
            <span className="text-white font-bold">{sessionInfo?.customerName || 'Connecting...'}</span>
          </div>
          <div className="flex items-center gap-1.5 border-r border-gray-750 pr-4">
            <span className="text-gray-450">Agent:</span>
            <span className="text-white font-bold">{sessionInfo?.agentName || 'Connecting...'}</span>
          </div>
          <div className="flex items-center gap-2 text-orange-405 font-mono font-black">
            <span>⏱️</span>
            <span>{formatDuration(durationSeconds)}</span>
          </div>
        </div>

        {/* Right: Status and Session ID */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isRecording && (
            <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black px-2.5 py-1 rounded-full uppercase animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              REC
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${remoteStream ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
            <span className="text-xs font-bold text-gray-300">
              {remoteStream ? 'Connected' : 'Connecting feed...'}
            </span>
          </div>
          <span className="text-[10px] font-mono bg-gray-950 text-gray-405 px-2.5 py-1.5 rounded border border-gray-800">
            SESSION: {sessionId}
          </span>
        </div>
      </header>

      {/* Device Permission Warning Overlay */}
      {permissionDenied && (
        <div className="bg-gradient-to-r from-red-900 to-red-950 border-b border-red-800 text-white px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20 shadow-lg">
          <div className="flex items-start md:items-center gap-3.5">
            <span className="text-2xl bg-red-500/10 p-2 rounded-xl text-red-400 border border-red-500/20">⚠️</span>
            <div>
              <h4 className="font-bold text-sm text-red-200">Camera & Microphone Access Blocked</h4>
              <p className="text-xs text-red-300/90 leading-relaxed mt-0.5">
                Assistly was unable to access your webcam or microphone. Please look for the camera/microphone icon in your browser's address bar, allow the permissions, and click retry to reload.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full md:w-auto bg-white hover:bg-gray-100 text-red-900 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
          >
            <span>🔄</span> Retry Device Check
          </button>
        </div>
      )}

      {/* Main Call View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Video Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center p-4">
          
          {/* Main Remote Screen */}
          <div className="w-full h-full relative rounded-2xl overflow-hidden bg-gray-950 flex items-center justify-center border border-gray-850 shadow-inner">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video-element w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 max-w-md text-center space-y-6">
                <div className="relative flex items-center justify-center w-24 h-24">
                  {/* Pulsing ring animations */}
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                  <div className="absolute -inset-2 rounded-full bg-primary/10 animate-pulse"></div>
                  <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary-dark text-white text-3xl shadow-lg">
                    {role === 'agent' ? '👤' : '🎧'}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-primary border border-primary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    Awaiting Remote Connection
                  </span>
                  <h3 className="text-xl font-bold text-gray-200">
                    {role === 'agent' ? 'Waiting for customer to connect...' : 'Waiting for support agent...'}
                  </h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
                    Once the other participant connects and shares their camera feed, the live stream will automatically load here.
                  </p>
                </div>
                {role === 'agent' && (
                  <div className="bg-gray-900/60 border border-gray-800 p-4 rounded-xl w-full text-left space-y-2">
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Quick Link for Customer</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/join/${sessionId}`}
                        className="bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-300 flex-1 outline-none"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(`${window.location.origin}/join/${sessionId}`);
                          alert('Invite link copied!');
                        }}
                        className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Small Local Picture-in-Picture Preview */}
            <div className="absolute bottom-4 right-4 w-40 sm:w-56 aspect-video rounded-xl overflow-hidden bg-gray-800 border-2 border-primary shadow-lg z-20 transition-all duration-300 hover:scale-105">
              {localStream && localStream.getVideoTracks().length > 0 ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="video-element"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-xs font-semibold text-gray-500">
                  Camera Off
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white">
                You ({name})
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Chat & Information */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col z-10">
          {/* Tabs / Headers */}
          <div className="border-b border-gray-700 bg-gray-900/50 p-4">
            <h3 className="font-bold text-sm text-gray-200">Support Session</h3>
            <p className="text-xs text-gray-400 mt-1">Chat logs are stored with session details</p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatLog.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6 text-gray-500 text-sm">
                No messages yet. Send a message to start the conversation.
              </div>
            ) : (
              chatLog.map((msg, idx) => {
                const isSelf = msg.sender === name;
                const isImage = msg.fileUrl && /\.(jpeg|jpg|gif|png|webp)$/i.test(msg.fileName);
                return (
                  <div key={idx} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-400 font-semibold mb-1">{msg.sender}</span>
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isSelf
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-gray-700 text-gray-100 rounded-tl-none'
                      }`}
                    >
                      {msg.fileUrl ? (
                        <div className="flex flex-col gap-2">
                          {isImage ? (
                            <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-lg max-h-32 object-cover border border-gray-600/30" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-base">📄</span>
                              <span className="font-semibold text-xs truncate max-w-[150px]">{msg.fileName}</span>
                            </div>
                          )}
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs font-bold underline ${
                              isSelf ? 'text-orange-200 hover:text-white' : 'text-primary hover:text-primary-dark'
                            }`}
                          >
                            Download
                          </a>
                        </div>
                      ) : (
                        msg.message
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Session Details / Info Widget */}
          <div className="p-4 border-t border-gray-700 bg-gray-900/30 text-xs space-y-2 text-gray-400 font-medium">
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-bold text-gray-300">{sessionInfo?.customerName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Agent:</span>
              <span className="font-bold text-gray-300">{sessionInfo?.agentName || 'N/A'}</span>
            </div>
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 bg-gray-900 flex gap-2 items-center">
            <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 p-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-all flex items-center justify-center w-10 h-10 shadow-md">
              <span>📎</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent text-sm h-10"
            />
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark p-2.5 rounded-xl font-semibold shadow-md transition-all duration-150 flex items-center justify-center w-10 h-10 text-lg"
            >
              ➔
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex items-center justify-center gap-4 z-10 shadow-md">
        
        {/* Toggle Mic */}
        <button
          onClick={toggleMic}
          className={`p-3.5 rounded-full font-semibold transition-all duration-200 ${
            micActive
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          }`}
          title={micActive ? 'Mute Mic' : 'Unmute Mic'}
        >
          {micActive ? '🎙️' : '🔇'}
        </button>

        {/* Toggle Cam */}
        <button
          onClick={toggleCam}
          className={`p-3.5 rounded-full font-semibold transition-all duration-200 ${
            camActive
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          }`}
          title={camActive ? 'Disable Camera' : 'Enable Camera'}
        >
          {camActive ? '📹' : '🚫'}
        </button>

        {/* Record Call Button (Agent-only) */}
        {role === 'agent' && (
          <button
            onClick={handleToggleRecording}
            className={`p-3.5 rounded-full font-semibold transition-all duration-200 ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            🔴 {isRecording ? 'Stop Rec' : 'Record'}
          </button>
        )}

        {/* End / Leave Call */}
        <button
          onClick={handleLeave}
          className="bg-red-500 hover:bg-red-600 px-6 py-3.5 rounded-xl font-bold shadow-md transition-all duration-200 flex items-center gap-2"
        >
          <span>🛑</span> {role === 'agent' ? 'End Session' : 'Leave Call'}
        </button>
      </footer>
    </div>
  );
}
