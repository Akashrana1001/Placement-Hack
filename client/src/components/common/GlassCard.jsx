import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard = ({ children, className = '', title, icon: Icon }) => (
  <motion.div 
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    transition={{ duration: 0.25 }}
    className={`bg-white/80 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-sm p-6 hover:border-sky-200/50 transition-colors duration-300 ${className}`}
  >
    {(title || Icon) && (
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        {Icon && <Icon className="w-5 h-5 text-sky-500" />}
        {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
      </div>
    )}
    {children}
  </motion.div>
);