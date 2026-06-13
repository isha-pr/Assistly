import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Sidebar({ activeTab }) {
  const navigate = useNavigate();
  const name = localStorage.getItem('agentName') || 'Support Specialist';
  const role = localStorage.getItem('agentRole') || 'agent';
  const email = localStorage.getItem('agentEmail') || 'specialist@assistly.com';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getInitials = (userName) => {
    return userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Nav Items config
  const navItems = [
    { 
      id: 'overview', 
      name: 'Overview', 
      path: '/dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    { 
      id: 'history', 
      name: 'Session history', 
      path: '/dashboard?tab=history',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'admin', 
      name: 'Admin Panel', 
      path: '/admin', 
      adminOnly: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  return (
    <aside className="w-64 bg-white text-gray-500 flex flex-col justify-between h-screen sticky top-0 z-30 border-r border-gray-200">
      
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Header Branding */}
        <div className="px-6 py-6 border-b border-gray-150 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C2410C] flex items-center justify-center text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.122-4.1-6.922-6.922l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-base tracking-tight block">Assistly</span>
            <p className="text-[10px] text-[#C2410C] font-extrabold uppercase tracking-wider leading-none mt-0.5">SUPPORT OPS</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5 mt-4">
          {navItems.map((item) => {
            if (item.adminOnly && role !== 'admin') {
              return null; // Hide admin only tabs for agents
            }
            
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#FFF7ED] text-[#C2410C]'
                    : 'text-gray-550 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={isActive ? 'text-[#C2410C]' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Info Footer */}
      <div className="p-4 border-t border-gray-150 bg-gray-50/50">
        
        {/* User Card */}
        <div className="flex items-center gap-3 p-2 rounded-lg mb-3">
          <div className="w-10 h-10 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#C2410C] font-bold text-sm">
            {getInitials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-gray-800 truncate">{name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${
                role === 'admin'
                  ? 'bg-red-50 text-red-650 border-red-150'
                  : 'bg-[#EA580C] text-white border-transparent'
              }`}>
                {role}
              </span>
              <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{email}</span>
            </div>
          </div>
        </div>

        {/* Logout Trigger */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-red-650 hover:bg-red-50 transition-all duration-150"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign out</span>
        </button>
      </div>

    </aside>
  );

}
