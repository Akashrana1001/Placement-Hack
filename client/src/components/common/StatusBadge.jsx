import React from 'react';
import { motion } from 'framer-motion';

export const StatusBadge = ({ variant = 'info', text, pulse = false }) => {
  const variants = {
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    danger: "bg-red-50 text-red-600 border-red-100",
    critical: "bg-red-100 text-red-700 border-red-200",
    info: "bg-sky-50 text-sky-600 border-sky-100"
  };

  return (
    <motion.span 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={pulse ? { opacity: 1, scale: [1, 1.05, 1] } : { opacity: 1, scale: 1 }}
      transition={pulse 
        ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
        : { type: 'spring', stiffness: 400, damping: 25 }}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${variants[variant]}`}
    >
      {pulse && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {text}
    </motion.span>
  );
};