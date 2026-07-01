import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Navbar } from './Navbar.jsx';
import { Sidebar } from './SideBar.jsx';

export const AppLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sky-500 font-medium">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        Initializing...
      </div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      <Navbar />
      <Sidebar />
      <main className="flex-1 ml-16 mt-16 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};