import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Activity, ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';

export const TPCStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['tpc-student', id],
    queryFn: async () => (await api.get(`/tpc/student/${id}`)).data.data
  });

  if (isLoading) return <div className="text-cyber-cyan animate-pulse">Decrypting student file...</div>;
  if (!data) return <div>Student not found.</div>;

  const { student, resume, plan, interviews, traces } = data;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/tpc')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Roster
      </button>

      {/* Header Profile */}
      <GlassCard className="flex justify-between items-start border-l-4 border-l-cyber-cyan">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{student.name}</h1>
          <div className="flex gap-4 text-sm text-gray-400 mb-4">
            <span className="flex items-center gap-1"><User className="w-4 h-4"/> {student.department}</span>
            <span>Year {student.year}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {student.skills?.map((s, i) => <StatusBadge key={i} text={s} variant="info" />)}
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className={`w-6 h-6 ${student.riskScore > 60 ? 'text-danger' : 'text-success'}`} />
            <span className="text-4xl font-bold">{student.riskScore}</span>
          </div>
          <span className="text-xs text-gray-500 uppercase">System Risk Score</span>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-px">
        {['overview', 'resume', 'traces'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 font-medium transition-colors ${activeTab === tab ? 'text-cyber-cyan border-b-2 border-cyber-cyan' : 'text-gray-500 hover:text-white'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Rendering based on Tab */}
      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <GlassCard title="Latest Plan Progress">
               {plan ? <p className="text-xl text-success font-bold">{Math.round((plan.progress.tasksCompleted/plan.progress.totalTasks)*100)}% Complete</p> : <p>No active plan.</p>}
            </GlassCard>
            <GlassCard title="Recent Interviews">
              {interviews?.length > 0 ? interviews.map(i => <div key={i._id} className="text-sm mb-2">{i.targetCompany} - {i.overallScore}/10</div>) : <p>No interviews taken.</p>}
            </GlassCard>
          </div>
        )}
        
        {activeTab === 'resume' && (
          <GlassCard title="Extracted Gap Report">
             <pre className="text-xs text-gray-400 whitespace-pre-wrap">{JSON.stringify(resume?.gapReport || "No data", null, 2)}</pre>
          </GlassCard>
        )}

        {activeTab === 'traces' && (
          <GlassCard title="Agent Execution History">
            {traces?.map(t => (
              <div key={t._id} className="flex justify-between items-center p-3 border-b border-white/5">
                <div>
                  <StatusBadge text={t.agentType.toUpperCase()} variant="info" />
                  <span className="text-gray-400 text-sm ml-4">{new Date(t.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-right text-xs font-mono">
                  <span className="text-gray-500 mr-4">{t.totalSteps} steps</span>
                  <span className="text-cyber-blue">{t.totalLatencyMs}ms</span>
                </div>
              </div>
            ))}
          </GlassCard>
        )}
      </div>
    </div>
  );
};