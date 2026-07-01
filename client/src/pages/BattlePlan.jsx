import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Map, ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import api from '../lib/api';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';

export const BattlePlan = () => {
  const [expandedWeek, setExpandedWeek] = useState(1);
  const [localTasks, setLocalTasks] = useState({});

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan'],
    queryFn: async () => {
      try {
        return (await api.get('/student/plan')).data.data;
      } catch (error) {
        if (error.response?.status === 404) return null; // Gracefully handle no plan
        throw error;
      }
    },
    retry: false // Don't retry if it's a 404
  });

  const toggleTask = (weekId, taskId) => {
    setLocalTasks(prev => ({
      ...prev,
      [`${weekId}-${taskId}`]: !prev[`${weekId}-${taskId}`]
    }));
    // In a full app, you would mutate this to the backend here
  };

  if (isLoading) return <div className="text-cyber-cyan animate-pulse">Loading Battle Plan...</div>;

  if (!plan) return (
    <GlassCard className="text-center py-12">
      <Map className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">No Battle Plan Found</h2>
      <p className="text-gray-400">Analyze your resume on the dashboard to generate a personalized strategy.</p>
    </GlassCard>
  );

  const totalTasks = plan.weeklyPlan?.reduce((acc, w) => acc + w.dailyTasks.length, 0) || 0;
  const completedLocal = Object.values(localTasks).filter(Boolean).length;
  const progressPct = totalTasks > 0 ? Math.round((completedLocal / totalTasks) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <GlassCard className="bg-gradient-to-br from-navy-900 to-navy-950">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyber-cyan to-cyber-blue flex items-center gap-2">
              <Map className="w-6 h-6 text-cyber-cyan" /> Action Plan ({plan.duration} Weeks)
            </h1>
            <div className="flex gap-2 mt-2">
              {plan.targetCompanies?.map((c, i) => <StatusBadge key={i} text={c} variant="info" />)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-success">{progressPct}%</span>
            <p className="text-xs text-gray-400 mt-1">COMPLETION</p>
          </div>
        </div>
        <div className="w-full bg-navy-950 rounded-full h-2">
          <div className="bg-gradient-to-r from-success to-cyber-emerald h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
        </div>
      </GlassCard>

      {/* Weekly Accordion */}
      <div className="space-y-4">
        {plan.weeklyPlan?.map((week, wIdx) => {
          const isExpanded = expandedWeek === week.week;
          return (
            <GlassCard key={wIdx} className={`p-0 overflow-hidden transition-all duration-300 ${isExpanded ? 'border-cyber-cyan/50 shadow-[0_0_15px_rgba(0,212,255,0.1)]' : ''}`}>
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedWeek(isExpanded ? null : week.week)}
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronDown className="text-cyber-cyan w-5 h-5" /> : <ChevronRight className="text-gray-500 w-5 h-5" />}
                  <h3 className={`text-lg font-medium ${isExpanded ? 'text-cyber-cyan' : 'text-white'}`}>Week {week.week}: {week.focus}</h3>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 bg-navy-950/30">
                  <div className="space-y-2">
                    {week.dailyTasks?.map((task, tIdx) => {
                      const isDone = localTasks[`${week.week}-${tIdx}`] || task.completed;
                      return (
                        <div key={tIdx} onClick={() => toggleTask(week.week, tIdx)} className={`flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-colors border border-transparent ${isDone ? 'bg-success/5 opacity-50' : 'bg-navy-900 hover:border-white/10'}`}>
                          <div className="mt-0.5">
                            {isDone ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-gray-500" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className={`font-medium ${isDone ? 'line-through text-gray-500' : 'text-white'}`}>Day {task.day}: {task.topic}</span>
                              <span className="text-xs text-cyber-blue bg-cyber-blue/10 px-2 py-0.5 rounded">{task.estimatedHours}h</span>
                            </div>
                            <p className={`text-sm mt-1 ${isDone ? 'text-gray-600' : 'text-gray-400'}`}>{task.task}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
};