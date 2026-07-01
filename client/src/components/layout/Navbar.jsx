import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rocket, LogOut, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState('bg-slate-300');

  useEffect(() => {
    api.get('/health').then(() => setStatus('bg-emerald-400')).catch(() => setStatus('bg-red-400'));
  }, []);

  return (
    <nav className="fixed top-0 w-full h-16 bg-white/70 backdrop-blur-2xl border-b border-slate-100 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-200/30">
          <Rocket className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-800">PlacementPilot</span>
      </div>
      
      {user && (
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status} animate-pulse`} title="System Status"></span>
          </div>
          
          <motion.div 
            className="relative cursor-pointer text-slate-400 hover:text-amber-500 transition-colors"
            whileHover={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </motion.div>

          <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
            <span className="text-sm font-medium text-slate-700">{user.name}</span>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold
              ${user.role === 'tpc' 
                ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                : 'bg-sky-50 text-sky-600 border border-sky-100'}`}>
              {user.role.toUpperCase()}
            </span>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout} 
              className="text-slate-400 hover:text-danger hover:bg-red-50 p-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      )}
    </nav>
  );
};