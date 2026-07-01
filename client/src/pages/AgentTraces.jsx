import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Terminal, Clock, Box } from 'lucide-react';
import api from '../lib/api';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { ThoughtStream } from '../components/agent/ThoughtStream';

export const AgentTraces = () => {
  const [selectedJob, setSelectedJob] = useState(null);

  const { data: traces, isLoading } = useQuery({
    queryKey: ['traces'],
    queryFn: async () => (await api.get('/agent/traces')).data.data
  });

  if (isLoading) return <div className="text-cyber-cyan">Accessing neural logs...</div>;

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      {/* Left List */}
      <div className="col-span-4 h-full overflow-y-auto pr-2 space-y-3">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Terminal className="w-5 h-5" /> Trace Logs</h2>
        {traces?.map(trace => (
          <div 
            key={trace.jobId} 
            onClick={() => setSelectedJob(trace.jobId)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedJob === trace.jobId ? 'bg-cyber-cyan/10 border-cyber-cyan' : 'bg-navy-900 border-white/5 hover:border-white/20'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <StatusBadge text={trace.agentType.toUpperCase()} variant={trace.status === 'completed' ? 'success' : 'danger'} />
              <span className="text-xs text-gray-500 font-mono">{(trace.totalLatencyMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
              <span className="flex items-center gap-1"><Box className="w-3 h-3"/> {trace.totalSteps} steps</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(trace.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Right Details */}
      <div className="col-span-8 h-full">
        {selectedJob ? (
           <ThoughtStream jobId={selectedJob} title="Trace Playback" />
        ) : (
          <GlassCard className="h-full flex items-center justify-center text-gray-500">
            Select a trace from the left to view the thought sequence.
          </GlassCard>
        )}
      </div>
    </div>
  );
};