import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, AlertTriangle, Target, CheckCircle, Bell, Server } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';
import toast from 'react-hot-toast';

export const TPCDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liveAlerts, setLiveAlerts] = useState([]);

  // Queries — refetch every 30s so data stays live without user action
  const { data: students } = useQuery({ 
    queryKey: ['tpc-dashboard'], 
    queryFn: async () => (await api.get('/tpc/dashboard')).data.data,
    refetchInterval: 30000
  });
  const { data: alertsDb } = useQuery({ 
    queryKey: ['tpc-alerts'], 
    queryFn: async () => (await api.get('/tpc/alerts')).data.data,
    refetchInterval: 15000  // alerts refresh faster
  });
  const { data: cache } = useQuery({ 
    queryKey: ['cache-stats'], 
    queryFn: async () => (await api.get('/agent/cache-stats')).data.data
  });
  const { data: stats } = useQuery({
    queryKey: ['tpc-stats'],
    queryFn: async () => (await api.get('/tpc/stats')).data.data,
    refetchInterval: 30000
  });

  // ⭐ FIX: Socket channel was 'tpc:alert' but Redis publisher sends 'tpc:alerts'
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleAlert = (alert) => {
      setLiveAlerts(prev => [alert, ...prev].slice(0, 10)); // cap at 10 live alerts
      queryClient.invalidateQueries(['tpc-alerts']); // also refresh DB alerts
      toast.error(`🚨 Risk Alert: ${alert.title || 'New alert received'}`, { duration: 6000 });
    };
    socket.on('tpc:alerts', handleAlert); // ← was wrongly 'tpc:alert'
    return () => socket.off('tpc:alerts', handleAlert);
  }, [queryClient]);

  const ackAlert = useMutation({
    mutationFn: async (id) => await api.patch(`/tpc/alerts/${id}/ack`),
    onSuccess: () => queryClient.invalidateQueries(['tpc-alerts'])
  });

  const combinedAlerts = [...liveAlerts, ...(alertsDb || [])].filter(a => !a.acknowledged).slice(0, 5);
  const atRiskCount = students?.filter(s => s.riskScore > 60).length || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      
      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-cyber-cyan/20 rounded-lg"><Users className="w-6 h-6 text-cyber-cyan" /></div>
          <div><p className="text-gray-400 text-sm">Total Students</p><p className="text-2xl font-bold">{students?.length || 0}</p></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4 border-danger/30">
          <div className="p-3 bg-danger/20 rounded-lg"><AlertTriangle className="w-6 h-6 text-danger animate-pulse" /></div>
          <div><p className="text-gray-400 text-sm">At Risk</p><p className="text-2xl font-bold text-danger">{atRiskCount}</p></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-success/20 rounded-lg"><Target className="w-6 h-6 text-success" /></div>
          <div><p className="text-gray-400 text-sm">Active Plans</p><p className="text-2xl font-bold">{students?.filter(s => s.planProgress).length || 0}</p></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 bg-warning/20 rounded-lg"><CheckCircle className="w-6 h-6 text-warning" /></div>
          <div><p className="text-gray-400 text-sm">Interviews Taken</p><p className="text-2xl font-bold">{stats?.totalInterviews ?? '--'}</p></div>
        </GlassCard>
      </div>

      {/* Student Table */}
      <GlassCard title="👨‍🎓 Sentinel Roster (Live Risk Ranking)">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="pb-3 px-4">Student</th>
                <th className="pb-3 px-4">Department</th>
                <th className="pb-3 px-4">Risk Score</th>
                <th className="pb-3 px-4">Plan Progress</th>
                <th className="pb-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {students?.map((s) => (
                <tr key={s._id} className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${s.riskScore > 80 ? 'bg-danger/5' : ''}`} onClick={() => navigate(`/app/tpc/student/${s._id}`)}>
                  <td className="py-3 px-4 font-medium">{s.name}</td>
                  <td className="py-3 px-4 text-gray-400 text-sm">{s.department}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${s.riskScore > 60 ? 'text-danger' : s.riskScore > 30 ? 'text-warning' : 'text-success'}`}>{s.riskScore}</span>
                      <div className="w-24 bg-navy-900 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${s.riskScore > 60 ? 'bg-danger' : s.riskScore > 30 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${s.riskScore}%` }}></div></div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{s.planProgress ? `${Math.round((s.planProgress.tasksCompleted/s.planProgress.totalTasks)*100)}%` : 'No Plan'}</td>
                  <td className="py-3 px-4 text-right"><span className="text-cyber-cyan text-sm hover:underline">Inspect →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        <GlassCard title="🚨 Live Alerts" icon={Bell}>
          <div className="space-y-3">
            {combinedAlerts.length === 0 ? <p className="text-gray-500 text-sm">No active alerts.</p> : null}
            {combinedAlerts.map((a, i) => (
              <div key={i} className="bg-navy-900 p-3 rounded-lg border border-white/5 flex justify-between items-start">
                <div>
                  <div className="flex gap-2 items-center mb-1">
                    <StatusBadge variant={a.severity === 'high' || a.severity === 'critical' ? 'critical' : 'warning'} text={a.severity.toUpperCase()} pulse={a.severity === 'critical'} />
                    <span className="text-sm font-medium text-white">{a.studentId?.name || 'Unknown Student'}</span>
                  </div>
                  <p className="text-sm text-gray-400">{a.title}</p>
                </div>
                {!a.acknowledged && (
                  <button onClick={() => ackAlert.mutate(a._id)} className="text-xs px-3 py-1 rounded border border-white/20 hover:bg-white/10 transition-colors">Ack</button>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="⚙️ System Health" icon={Server}>
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32">
              <PieChart width={128} height={128}>
                <Pie data={[{ value: cache?.ratio || 0 }, { value: 100 - (cache?.ratio || 0) }]} cx={64} cy={64} innerRadius={40} outerRadius={60} stroke="none" dataKey="value">
                  <Cell fill="#00d4ff" /><Cell fill="#1e293b" />
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-cyber-cyan">{cache?.ratio || 0}%</span>
                <span className="text-[10px] text-gray-500">CACHE HIT</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Total Agent Calls</span><span className="font-mono">{cache?.totalCalls || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Services</span><span className="text-success font-mono">ALL ONLINE</span></div>
              <div className="pt-3 border-t border-white/10">
                <a href="http://localhost:5000/admin/queues" target="_blank" rel="noreferrer" className="text-sm text-cyber-blue hover:underline">Open BullMQ Dashboard ↗</a>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};