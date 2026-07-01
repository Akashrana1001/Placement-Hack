import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Rocket, Target, Zap, Activity, Users, CheckCircle, Upload, FileUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { ThoughtStream } from '../components/agent/ThoughtStream';
import { useAgentStream } from '../hooks/useAgentStream';

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let end = parseFloat(value) || 0;
    if (end === 0) return setDisplay(0);
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / 1000, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.floor(end * ease));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [value]);
  return <>{display}</>;
};

export const StudentDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const redirecting = useRef(false);
  const [resumeText, setResumeText] = useState('');
  const [activeJobId, setActiveJobId] = useState(null);
  const [inputMode, setInputMode] = useState('text');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: analysis } = useQuery({
    queryKey: ['analysis'],
    queryFn: async () => (await api.get('/student/analysis')).data.data,
    retry: false
  });

  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: async () => (await api.get('/student/progress')).data.data,
    refetchInterval: (query) => {
      const data = query.state?.data;
      if (analysis?.gapReport && (!data?.planProgress || data.planProgress.totalTasks === 0)) return 3000;
      return false;
    }
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const uploadResume = useMutation({
    mutationFn: async (text) => (await api.post('/student/resume', { resumeText: text })).data.data,
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast.success('🚀 Resume analysis started!');
      queryClient.invalidateQueries(['analysis']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Upload failed.')
  });

  const uploadResumeFile = useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('resume', file);
      return (await api.post('/student/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })).data.data;
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      setSelectedFile(null);
      toast.success(`✅ ${data.message}`);
      queryClient.invalidateQueries(['analysis']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'File upload failed.')
  });

  const generatePlan = useMutation({
    mutationFn: async () => (await api.post('/student/plan/generate')).data.data,
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast.success('⚔️ Strategy Agent activated!');
    }
  });

  // ── File drag / drop helpers ──────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleFilePick = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  // ── Auto-refresh after agent stream ends ──────────────────────────────────
  const { isStreaming, latestStep } = useAgentStream(activeJobId);

  useEffect(() => {
    if (latestStep?.action === 'CHAIN_AGENT' && latestStep?.nextJobId) {
      setActiveJobId(latestStep.nextJobId);
    }
  }, [latestStep]);

  useEffect(() => {
    if (activeJobId && !isStreaming) {
      const timer = setTimeout(() => {
        queryClient.invalidateQueries(['analysis']);
        queryClient.invalidateQueries(['progress']);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, activeJobId, queryClient]);

  // ── Auto Redirect to Battle Plan ──────────────────────────────────────────
  // ⭐ BUG FIX: Added `activeJobId &&` so redirect only happens after a fresh
  //    upload — not every time the page loads when plan already exists.
  useEffect(() => {
    if (
      activeJobId &&
      analysis?.gapReport &&
      progress?.planProgress?.totalTasks > 0 &&
      !redirecting.current
    ) {
      redirecting.current = true;
      toast.success('⚔️ Your Battle Plan is ready!');
      setTimeout(() => navigate('/battle-plan'), 2000);
    }
  }, [analysis, progress, navigate, activeJobId]);

  const gapReport = analysis?.gapReport;
  const matches = analysis?.companyMatches;
  const isUploading = uploadResume.isPending || uploadResumeFile.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* LEFT COLUMN */}
      <div className="lg:col-span-7 space-y-6">

        {/* ── Resume Upload Card ── */}
        <GlassCard title="📄 Upload Your Resume" icon={FileText}>
          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-navy-950 rounded-lg mb-4 w-fit border border-white/5">
            {['text', 'file'].map(mode => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                  ${inputMode === mode
                    ? 'bg-sky-50 text-sky-600 border border-sky-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'}`}
              >
                {mode === 'text' ? '✏️ Paste Text' : '📎 Upload File'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Text Paste Mode ── */}
            {inputMode === 'text' && (
              <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume text here... (Include skills, projects, education, experience)"
                  className="w-full h-44 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 font-['JetBrains_Mono'] text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none resize-none mb-4 transition-all shadow-inner"
                />
                <Button
                  className="w-full"
                  isLoading={uploadResume.isPending}
                  onClick={() => uploadResume.mutate(resumeText)}
                  disabled={!resumeText.trim() || isUploading}
                >
                  <Rocket className="w-4 h-4" /> Analyze Resume
                </Button>
              </motion.div>
            )}

            {/* ── File Upload Mode ── */}
            {inputMode === 'file' && (
              <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 mb-4
                    ${dragOver
                      ? 'border-cyber-cyan bg-cyber-cyan/10 scale-[1.01]'
                      : selectedFile
                        ? 'border-success/50 bg-success/5'
                        : 'border-white/10 bg-navy-900 hover:border-cyber-cyan/40 hover:bg-navy-900/80'}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                  {selectedFile ? (
                    <>
                      <CheckCircle className="w-10 h-10 text-success" />
                      <div className="text-center">
                        <p className="text-slate-800 font-bold">{selectedFile.name}</p>
                        <p className="text-slate-500 text-xs mt-1 font-medium">
                          {(selectedFile.size / 1024).toFixed(1)} KB — click to change
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-10 h-10 text-gray-500" />
                      <div className="text-center">
                        <p className="text-slate-600 font-bold">Drop your resume here</p>
                        <p className="text-slate-400 text-xs mt-1 font-medium">PDF, DOCX, DOC, or TXT · Max 5MB</p>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  className="w-full"
                  isLoading={uploadResumeFile.isPending}
                  onClick={() => selectedFile && uploadResumeFile.mutate(selectedFile)}
                  disabled={!selectedFile || isUploading}
                >
                  <Upload className="w-4 h-4" />
                  {uploadResumeFile.isPending ? 'Parsing & Analyzing...' : 'Upload & Analyze'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* ── Gap Report / Intelligence ── */}
        {gapReport && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard title="📊 Intelligence Report" icon={Activity}>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm text-gray-400 mb-2">Critical Gaps</h4>
                  <div className="flex flex-wrap gap-2">
                    {(gapReport.criticalGaps || []).map((g, i) => (
                      <StatusBadge key={i} variant="critical" text={g} pulse />
                    ))}
                    {(!gapReport.criticalGaps || gapReport.criticalGaps.length === 0) && (
                      <span className="text-gray-500 text-sm">None detected</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm text-gray-400 mb-2">Strong Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {(gapReport.strongAreas || []).map((s, i) => (
                        <StatusBadge key={i} variant="success" text={s} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-400 mb-2">Weak Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {(gapReport.weakAreas || []).map((w, i) => (
                        <StatusBadge key={i} variant="warning" text={w} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Company Matches */}
                {matches && matches.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm text-gray-400 mb-3">Top Company Matches</h4>
                    <div className="space-y-3">
                      {matches.map((match, i) => (
                        <div key={i} className="bg-navy-900 p-3 rounded-lg border border-white/5">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-slate-800">{match.companyName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-mono
                              ${match.matchScore > 75
                                ? 'bg-success/20 text-success'
                                : match.matchScore > 50
                                  ? 'bg-warning/20 text-warning'
                                  : 'bg-danger/20 text-danger'}`}>
                              {match.matchScore}% Match
                            </span>
                          </div>
                          <div className="w-full bg-navy-950 rounded-full h-1.5 mb-2">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-700
                                ${match.matchScore > 75
                                  ? 'bg-success'
                                  : match.matchScore > 50
                                    ? 'bg-warning'
                                    : 'bg-danger'}`}
                              style={{ width: `${match.matchScore}%` }}
                            />
                          </div>
                          {match.missingSkills?.length > 0 && (
                            <p className="text-xs text-danger">
                              Missing: {match.missingSkills.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Battle Plan Status */}
                {(!progress?.planProgress || progress.planProgress.totalTasks === 0) ? (
                  <div className="flex bg-slate-100 p-4 rounded-xl items-center gap-3 w-full justify-center text-slate-600 font-bold mb-4 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating your customized Battle Plan... Please wait.
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full border-sky-500/50 text-sky-600 hover:bg-sky-50 transition-colors"
                    onClick={() => navigate('/battle-plan')}
                  >
                    <Target className="w-4 h-4" /> View Battle Plan
                  </Button>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="flex-1">
          <ThoughtStream jobId={activeJobId} />
        </div>

        {/* Quick Stats */}
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <GlassCard className="p-4 flex flex-col items-center text-center h-full">
              <CheckCircle className="w-6 h-6 text-success mb-2" />
              <span className="text-2xl font-bold">
                <AnimatedNumber value={progress?.planProgress?.tasksCompleted || 0} />
              </span>
              <span className="text-xs text-gray-400">Tasks Done</span>
            </GlassCard>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <GlassCard className="p-4 flex flex-col items-center text-center h-full">
              <Target className="w-6 h-6 text-cyber-blue mb-2" />
              <span className="text-2xl font-bold">
                <AnimatedNumber value={progress?.avgInterviewScore || 0} />/10
              </span>
              <span className="text-xs text-gray-400">Avg Score</span>
            </GlassCard>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <GlassCard className="p-4 flex flex-col items-center text-center h-full">
              <Zap className={`w-6 h-6 mb-2 ${(progress?.riskScore || 0) > 60 ? 'text-danger' : 'text-warning'}`} />
              <span className="text-2xl font-bold"><AnimatedNumber value={progress?.riskScore || 0} /></span>
              <span className="text-xs text-gray-400">Risk Score</span>
            </GlassCard>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <GlassCard className="p-4 flex flex-col items-center text-center h-full">
              <Users className="w-6 h-6 text-cyber-cyan mb-2" />
              <span className="text-2xl font-bold"><AnimatedNumber value={progress?.totalInterviews || 0} /></span>
              <span className="text-xs text-gray-400">Interviews</span>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};