import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supportBg from '../assets/support_background.png';

export default function AgentLogin() {
  const [email, setEmail] = useState('agent@assistly.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [stats, setStats] = useState({ activeSessions: 0, resolutionRate: 100 });
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3001/api/public/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats({
          activeSessions: data.activeSessions ?? 0,
          resolutionRate: data.resolutionRate ?? 100
        });
      })
      .catch((err) => console.error('Failed to load login stats:', err));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store credentials and roles
      localStorage.setItem('agentToken', data.token);
      localStorage.setItem('agentName', data.user.name);
      localStorage.setItem('agentEmail', data.user.email);
      localStorage.setItem('agentRole', data.user.role);

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleType) => {
    if (roleType === 'agent') {
      setEmail('agent@assistly.com');
      setPassword('password123');
    } else {
      setEmail('admin@assistly.com');
      setPassword('password123');
    }
    setShowDemo(false);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-gray-50 text-gray-800 font-sans">
      
      {/* Left Column: Product Branding & Features (visible on lg screens and up) */}
      <div className="hidden lg:flex lg:col-span-5 p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Background Image and Gradient Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={supportBg}
            alt="Support operations background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Rich orange-slate gradient overlay for readability and screenshot design match */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#EA580C]/95 via-[#C2410C]/90 to-[#0F172A]/95 mix-blend-multiply"></div>
        </div>

        {/* Logo Header */}
        <div className="flex items-center gap-3 relative z-20">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.122-4.1-6.922-6.922l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">AssistLy</h1>
            <p className="text-[8px] text-orange-200 font-extrabold tracking-wider uppercase mt-1">Enterprise Support Platform</p>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="space-y-5 relative z-20 my-auto">
          <div className="space-y-2.5">
            <span className="inline-flex px-2.5 py-0.5 text-[9px] font-bold bg-white/10 text-white rounded-full uppercase tracking-wide border border-white/10">
              V1.2 ENTERPRISE
            </span>
            <h2 className="text-3xl font-extrabold leading-tight text-white">
              See the problem. <br />
              Resolve it <span className="text-orange-200">instantly.</span>
            </h2>
          </div>
          <p className="text-orange-50/80 text-sm leading-relaxed max-w-sm">
            Empower your team with secure, zero-install WebRTC video sessions. Route media directly through self-hosted infrastructure and capture full call transcripts and diagnostics.
          </p>
        </div>

        {/* Product Feature Cards (Stacked Vertically) */}
        <div className="space-y-3.5 relative z-20 max-w-md w-full">
          <p className="text-[10px] text-orange-200 font-bold uppercase tracking-wider">Platform Features</p>
          
          {/* Card 1: Video Support Sessions */}
          <div className="bg-black/20 border border-white/10 backdrop-blur-md p-4.5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Video Support Sessions</p>
              <p className="text-xs text-orange-100/75">Real-time browser-based support</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Card 2: Session Recording */}
          <div className="bg-black/20 border border-white/10 backdrop-blur-md p-4.5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Session Recording</p>
              <p className="text-xs text-orange-100/75">Record and review every support call</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Card 3: Support Notes */}
          <div className="bg-black/20 border border-white/10 backdrop-blur-md p-4.5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Support Notes</p>
              <p className="text-xs text-orange-100/75">Capture issue descriptions and resolutions</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>


        {/* Left Footer Info */}
        <div className="text-[10px] text-orange-200/60 relative z-20 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Secure. Reliable. Built for Support Teams.</span>
        </div>
      </div>

      {/* Right Column: Authentication Card Form */}
      <div className="lg:col-span-7 flex flex-col justify-between p-8 relative bg-gray-50">
        
        {/* Empty top block to help push card to center */}
        <div className="hidden lg:block"></div>

        {/* Mobile Header (visible only on mobile/tablet) */}
        <div className="flex items-center gap-3 mb-8 lg:hidden mt-4">
          <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.122-4.1-6.922-6.922l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          <span className="font-extrabold text-lg tracking-tight text-gray-900">AssistLy</span>
        </div>

        {/* Premium Login Card */}
        <div className="w-full max-w-[460px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-gray-100 p-10 space-y-8 mx-auto">
          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Sign in to your account</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Enterprise Console Login</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-semibold p-4 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-gray-800 text-sm shadow-sm placeholder-gray-400 bg-gray-50/20"
                  placeholder="agent@assistly.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Password</label>
                <a href="#forgot" className="text-xs text-primary hover:text-primary-dark font-medium transition-all">Forgot password?</a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-gray-800 text-sm shadow-sm placeholder-gray-400 bg-gray-50/20"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                />
                <span className="text-xs text-gray-500 font-medium">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3.5 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-[0.98] text-sm"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Judge / Hackathon Quick Logins (Collapsible drawer) */}
          <div className="border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/70">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full px-5 py-3.5 flex justify-between items-center text-xs font-bold text-gray-500 hover:bg-gray-100/50 transition-all border-b border-gray-150"
            >
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 10-4 0v2m4 0h3a2 2 0 012 2v3m-2-3H9m12 0h-3m-12 0H5a2 2 0 00-2 2v3m2-3h9" />
                </svg>
                <span>Quick Demo Access Accounts</span>
              </span>
              <span>{showDemo ? '▲' : '▼'}</span>
            </button>
            
            {showDemo && (
              <div className="p-4 space-y-3 bg-white/50 border-t border-gray-100 animate-slideDown">
                <div
                  onClick={() => handleQuickFill('agent')}
                  className="bg-white hover:bg-orange-50/30 border border-gray-150 hover:border-primary/30 p-3.5 rounded-xl text-left transition-all group shadow-sm flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm bg-orange-50 text-primary p-2 rounded-lg border border-orange-100">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-800 group-hover:text-primary">Agent Account</p>
                      <p className="text-[10px] text-gray-400 font-medium">agent@assistly.com</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-orange-50 text-primary border border-orange-100">
                    Agent
                  </span>
                </div>

                <div
                  onClick={() => handleQuickFill('admin')}
                  className="bg-white hover:bg-orange-50/30 border border-gray-155 hover:border-primary/30 p-3.5 rounded-xl text-left transition-all group shadow-sm flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm bg-red-50 text-red-500 p-2 rounded-lg border border-red-100">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-800 group-hover:text-primary">Admin Account</p>
                      <p className="text-[10px] text-gray-400 font-medium">admin@assistly.com</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-red-50 text-red-650 border border-red-100">
                    Admin
                  </span>
                </div>
                
                <p className="text-[10px] text-gray-400 text-center font-medium mt-2">
                  Password for demo accounts: <span className="font-bold text-gray-600">password123</span>
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Footer */}
        <div className="text-[10px] text-gray-400 text-center flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 mt-8">
          <span>© {new Date().getFullYear()} Assistly Inc. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#privacy" className="hover:text-gray-650 transition-all">Privacy Policy</a>
            <span>|</span>
            <a href="#terms" className="hover:text-gray-650 transition-all">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}

