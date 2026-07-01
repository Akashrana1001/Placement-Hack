import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAgentStream } from '../../hooks/useAgentStream';
import { GlassCard } from '../common/GlassCard';

export const ThoughtStream = ({ jobId, title = "Agent Live Feed" }) => {
  const { steps, isStreaming, latestStep } = useAgentStream(jobId);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (!jobId) {
    return (
      <GlassCard className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <BrainCircuit className="w-16 h-16 mb-4 opacity-20" />
        <p>Waiting for agent activation...</p>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{ height: '100%' }}
    >
      <GlassCard 
        title={title} 
        icon={BrainCircuit} 
        className={`h-full min-h-[400px] flex flex-col relative overflow-hidden transition-colors duration-1000 ${latestStep?.isDone ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : ''}`}
      >
      {isStreaming && (
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-600 font-mono font-semibold">LIVE</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 font-['JetBrains_Mono'] text-sm">
        {steps.map((step, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="border-l-2 border-slate-200 pl-4 py-2 space-y-2"
          >
            {step.thought && (
              <div>
                <motion.span 
                  animate={{ opacity: [1, 0.7, 1] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-md text-xs mr-2 border border-sky-100 font-semibold"
                >
                  THINK
                </motion.span>
                <span className="text-slate-600">{step.thought}</span>
              </div>
            )}
            
            {step.action && (
              <div>
                <motion.span 
                  initial={{ backgroundColor: '#fef3c7' }}
                  animate={{ backgroundColor: ['#fde68a', '#fef3c7'] }}
                  transition={{ duration: 0.5 }}
                  className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md text-xs mr-2 border border-amber-100 font-semibold"
                >
                  ACT
                </motion.span>
                <span className="text-amber-700 font-medium">{step.action}</span>
                <ExpandableData data={step.actionInput} />
              </div>
            )}

            {step.observation && (
              <div>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-xs mr-2 border border-emerald-100 font-semibold"
                >
                  OBSERVE
                </motion.span>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-500"
                >
                  {step.observation.length > 100 ? step.observation.substring(0, 100) + '...' : step.observation}
                </motion.span>
              </div>
            )}

            {step.isDone && step.finalAnswer && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-emerald-700 font-medium font-['Plus_Jakarta_Sans']">
                  {typeof step.finalAnswer === 'string' ? step.finalAnswer : "Analysis Complete"}
                </span>
              </div>
            )}
          </motion.div>
        ))}
        
        {isStreaming && !latestStep?.isDone && (
          <div className="pl-4 py-2">
            <span className="animate-pulse text-slate-400 font-['JetBrains_Mono']">Processing...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      </GlassCard>
    </motion.div>
  );
};

const ExpandableData = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;
  return (
    <span className="ml-2 text-slate-400 text-xs">
      <button onClick={() => setExpanded(!expanded)} className="hover:text-slate-700 flex inline-flex items-center gap-1">
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide' : 'View Payload'}
      </button>
      {expanded && <pre className="mt-2 p-2 bg-slate-50 rounded-lg overflow-x-auto border border-slate-100 text-slate-600">{JSON.stringify(data, null, 2)}</pre>}
    </span>
  );
};