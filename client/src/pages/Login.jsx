import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: 'priya@test.com', password: 'password123', role: 'student' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success("Login successful!");
      } else {
        await register(formData);
        toast.success("Registration successful!");
      }
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-100/60 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8 z-10"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-200/50">
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">PlacementPilot</h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md z-10 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 p-8"
      >
        <div className="flex gap-6 mb-8 border-b border-slate-100 pb-4">
          <button onClick={() => setIsLogin(true)} className={`text-lg font-bold transition-colors ${isLogin ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}>Login</button>
          <button onClick={() => setIsLogin(false)} className={`text-lg font-bold transition-colors ${!isLogin ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}>Register</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Full Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all" 
                  placeholder="Enter your name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all appearance-none cursor-pointer">
                  <option value="student">Student</option>
                  <option value="tpc">TPC Admin</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email Address</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all" 
              placeholder="you@university.edu" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Password</label>
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all" 
              placeholder="••••••••" />
          </div>
          
          <Button type="submit" className="w-full mt-8 py-3.5 text-lg shadow-lg shadow-sky-200/50">
            {isLogin ? 'Access Dashboard' : 'Initialize Account'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};