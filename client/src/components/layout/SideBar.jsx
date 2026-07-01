import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Map, Mic, Terminal, Monitor, Bell, Users, ExternalLink } from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const links = user?.role === 'student' 
    ? [
        { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/app/plan", icon: Map, label: "Battle Plan" },
        { to: "/app/interview", icon: Mic, label: "Mock Interview" },
        { to: "/app/traces", icon: Terminal, label: "Traces" },
      ]
    : [
        { to: "/app/tpc", icon: Monitor, label: "Command Center" },
        { to: "/app/tpc/alerts", icon: Bell, label: "Alerts" },
        { to: "/app/tpc/students", icon: Users, label: "Students" },
        { to: "/app/tpc/traces", icon: Terminal, label: "Traces" },
      ];

  return (
    <aside 
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white/70 backdrop-blur-2xl border-r border-slate-100 transition-all duration-300 z-40 flex flex-col ${expanded ? 'w-56' : 'w-16'}`}
    >
      <div className="flex-1 py-6 flex flex-col gap-1 px-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
            ${isActive 
              ? 'bg-sky-50 text-sky-600 font-medium border border-sky-100' 
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent'}`}>
            <Icon className="w-5 h-5 shrink-0" />
            <span className={`whitespace-nowrap text-sm transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 overflow-hidden'}`}>{label}</span>
          </NavLink>
        ))}
      </div>
      <div className="p-2 border-t border-slate-100">
        <a href="https://placement-hack.onrender.com/admin/queues/" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
          <ExternalLink className="w-5 h-5 shrink-0" />
          <span className={`whitespace-nowrap text-sm transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 overflow-hidden'}`}>Queue Dashboard</span>
        </a>
      </div>
    </aside>
  );
};