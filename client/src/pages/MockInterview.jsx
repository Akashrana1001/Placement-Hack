import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell } from 'recharts';
import { Mic, Send, Award, Play, ChevronRight, CheckCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';

// ─────────────────────────────────────────────────────────────────────────────
// Client-side keyword evaluator — instant, no network call needed
// ─────────────────────────────────────────────────────────────────────────────
function localEvaluate(answer, expectedKeywords = []) {
  const lower = (answer || '').toLowerCase();
  const matched = expectedKeywords.filter(kw => lower.includes(kw.toLowerCase()));
  const score = expectedKeywords.length > 0
    ? Math.max(2, Math.round((matched.length / expectedKeywords.length) * 10))
    : 5;
  const feedback =
    score >= 8 ? '🔥 Excellent! Very strong answer.' :
    score >= 6 ? '✅ Good answer. Could expand a bit more.' :
    score >= 4 ? '⚠️ Partial. You missed some key concepts.' :
                 '❌ Needs more depth. Revisit the fundamentals.';
  return { score, feedback, matched };
}

// ─────────────────────────────────────────────────────────────────────────────
export const MockInterview = () => {
  const [phase, setPhase]       = useState('setup');   // setup | interview | results
  const [interviewType, setType] = useState('technical');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer]     = useState('');
  // answered is a ref-like array that we always update before passing to complete
  const [answered, setAnswered] = useState([]);
  const [feedbackPanel, setFeedback] = useState(null); // shown after each answer
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [isLastSubmitted, setIsLastSubmitted] = useState(false); // guard for last Q

  const currentQ = questions[currentIdx] || null;
  const isLastQuestion = currentIdx === questions.length - 1;

  // ── 1. START ────────────────────────────────────────────────────────────
  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/student/interview/start', { type: interviewType });
      const qs = res.data.data.questions;
      if (!qs || qs.length === 0) {
        toast.error('No questions found for this type. Try another.');
        return;
      }
      setQuestions(qs);
      setCurrentIdx(0);
      setAnswered([]);
      setFeedback(null);
      setIsLastSubmitted(false);
      setPhase('interview');
      toast.success('Interview started! Good luck 🚀');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start interview.');
    } finally {
      setLoading(false);
    }
  };

  // ── 2. SUBMIT ANSWER (also handles last question correctly) ─────────────
  const handleSubmit = () => {
    if (!answer.trim() || !currentQ || feedbackPanel) return; // idempotent guard

    const evaluation = localEvaluate(answer, currentQ.expectedKeywords || []);
    setFeedback(evaluation);

    const record = {
      question: currentQ.question,
      topic: currentQ.topic,
      studentAnswer: answer,
      score: evaluation.score,
      feedback: evaluation.feedback,
    };

    // Compute new array synchronously — do NOT rely on React state being updated
    const newAnswered = [...answered, record];
    setAnswered(newAnswered);

    if (isLastQuestion) {
      setIsLastSubmitted(true);
    }
  };

  // ── 3. NEXT QUESTION ────────────────────────────────────────────────────
  const handleNext = () => {
    setFeedback(null);
    setAnswer('');
    setCurrentIdx(i => i + 1);
  };

  // ── 4. COMPLETE: save to DB ─────────────────────────────────────────────
  // Receives the definitive `answeredList` to avoid stale closure bug
  const handleComplete = async (answeredList) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post('/student/interview/complete', {
        interviewType,
        answeredQuestions: answeredList,
      });
      setResult(res.data.data);
      setPhase('results');
    } catch (err) {
      toast.error('Saved locally — could not reach server.');
      // Graceful local fallback
      const avg = answeredList.length > 0
        ? Math.round(answeredList.reduce((a, r) => a + r.score, 0) / answeredList.length)
        : 0;
      setResult({
        overallScore: avg,
        recommendation: `You scored ${avg}/10. ${avg >= 7 ? 'Great job!' : 'Keep practicing!'}`,
        strengths: [...new Set(answeredList.filter(q => q.score >= 7).map(q => q.topic))],
        weaknesses: [...new Set(answeredList.filter(q => q.score < 5).map(q => q.topic))],
      });
      setPhase('results');
    } finally {
      setLoading(false);
    }
  };

  // ── 5. RESET ────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPhase('setup');
    setQuestions([]);
    setCurrentIdx(0);
    setAnswered([]);
    setAnswer('');
    setFeedback(null);
    setResult(null);
    setIsLastSubmitted(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[calc(100vh-8rem)]"
    >
      <AnimatePresence mode="wait">

        {/* ──────────── SETUP PHASE ──────────── */}
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="max-w-md mx-auto mt-16">
            <GlassCard title="🎤 Mock Interview Arena" icon={Mic}>
              <form onSubmit={handleStart} className="space-y-5">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Interview Type</label>
                  <select
                    value={interviewType}
                    onChange={e => setType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="technical">💻 Technical (DSA + OOP)</option>
                    <option value="hr">🤝 HR & Behavioural</option>
                    <option value="system-design">🏗️ System Design</option>
                  </select>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-sm text-slate-500">
                  <p>✅ 5 randomized questions per session</p>
                  <p>⚡ Instant AI-powered evaluation</p>
                  <p>💾 Results saved to your profile automatically</p>
                </div>

                <Button type="submit" className="w-full" isLoading={loading}>
                  <Play className="w-4 h-4" /> Enter Arena
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* ──────────── INTERVIEW PHASE ──────────── */}
        {phase === 'interview' && currentQ && (
          <motion.div key={`interview-${currentIdx}`}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto mt-6 space-y-4"
          >
            {/* Progress Header */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 whitespace-nowrap font-mono">
                {currentIdx + 1} / {questions.length}
              </span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-blue rounded-full"
                  initial={{ width: `${(currentIdx / questions.length) * 100}%` }}
                  animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs px-2 py-1 rounded bg-cyber-cyan/10 text-cyber-cyan font-mono uppercase border border-cyber-cyan/20">
                {currentQ.topic}
              </span>
            </div>

            {/* Question Card */}
            <GlassCard className="p-8 border-cyber-cyan/20">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-cyber-cyan/10 shrink-0">
                  <Mic className="w-6 h-6 text-cyber-cyan" />
                </div>
                <h2 className="text-xl font-medium leading-relaxed text-slate-800">{currentQ.question}</h2>
              </div>
            </GlassCard>

            {/* Instant Feedback Banner */}
            <AnimatePresence>
              {feedbackPanel && (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className={`rounded-lg p-4 border flex items-start gap-3 overflow-hidden
                    ${feedbackPanel.score >= 7 ? 'bg-success/10 border-success/30 text-success'
                      : feedbackPanel.score >= 5 ? 'bg-warning/10 border-warning/30 text-warning'
                      : 'bg-danger/10 border-danger/30 text-danger'}`}
                >
                  <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Score: {feedbackPanel.score} / 10</p>
                    <p className="text-sm opacity-90 mt-0.5">{feedbackPanel.feedback}</p>
                    {feedbackPanel.matched?.length > 0 && (
                      <p className="text-xs opacity-70 mt-1">
                        Keywords covered: {feedbackPanel.matched.join(', ')}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Answer Box */}
            <GlassCard className="p-5">
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={!!feedbackPanel}
                placeholder={feedbackPanel ? 'Answer submitted ✓ — click the button to continue.' : 'Type your answer here... (be thorough, mention key concepts)'}
                rows={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 placeholder:text-slate-400 font-medium resize-none outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner disabled:opacity-40 disabled:bg-slate-100 disabled:cursor-not-allowed mb-4"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{answer.length} characters</span>

                <div className="flex gap-3">
                  {/* Main Action Button — changes based on state */}
                  {!feedbackPanel && (
                    <Button onClick={handleSubmit} disabled={!answer.trim()}>
                      <Send className="w-4 h-4" />
                      Submit Answer
                    </Button>
                  )}

                  {feedbackPanel && !isLastQuestion && (
                    <Button onClick={handleNext}>
                      Next Question <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}

                  {/* ⭐ FIX: Explicitly shown "Finish" button for the last question */}
                  {feedbackPanel && isLastQuestion && (
                    <Button
                      onClick={() => handleComplete(answered)}
                      isLoading={loading}
                      className="bg-success/20 border-success/40 text-success hover:bg-success/30"
                    >
                      <Award className="w-4 h-4" />
                      {loading ? 'Saving Results...' : 'Finish & See Results'}
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ──────────── RESULTS PHASE ──────────── */}
        {phase === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto mt-6 space-y-6">

            <GlassCard className="text-center p-10 border-success/20">
              <Award className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Interview Complete!</h2>
              <p className="text-slate-500 max-w-md mx-auto font-medium">{result.recommendation}</p>

              {/* Score Donut */}
              <div className="flex justify-center my-8">
                <div className="relative w-48 h-48">
                  <PieChart width={200} height={200}>
                    <Pie
                      data={[{ value: result.overallScore }, { value: 10 - result.overallScore }]}
                      cx={100} cy={100} innerRadius={60} outerRadius={80}
                      startAngle={90} endAngle={-270} dataKey="value" stroke="none"
                    >
                      <Cell fill={result.overallScore >= 7 ? '#22c55e' : result.overallScore >= 5 ? '#f59e0b' : '#ef4444'} />
                      <Cell fill="#0f172a" />
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-extrabold text-slate-800">{result.overallScore}</span>
                    <span className="text-slate-400 text-sm font-semibold mt-1">/ 10</span>
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-6 text-left mb-8">
                <div className="bg-success/5 border border-success/20 rounded-xl p-5">
                  <h3 className="text-success font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Strong Topics
                  </h3>
                  {result.strengths?.length > 0
                    ? <ul className="space-y-1.5">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="text-gray-300 capitalize flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    : <p className="text-gray-500 text-sm">Practice more to build strong areas!</p>
                  }
                </div>
                <div className="bg-danger/5 border border-danger/20 rounded-xl p-5">
                  <h3 className="text-danger font-semibold mb-3">⚠️ Needs Work</h3>
                  {result.weaknesses?.length > 0
                    ? <ul className="space-y-1.5">
                        {result.weaknesses.map((w, i) => (
                          <li key={i} className="text-gray-300 capitalize flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    : <p className="text-gray-500 text-sm">No weak areas — great performance!</p>
                  }
                </div>
              </div>

              {/* Per-question breakdown */}
              <div className="text-left mb-8 space-y-2">
                <h3 className="text-slate-800 font-bold mb-3 text-left tracking-tight">📋 Question Breakdown</h3>
                {answered.map((q, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <span className={`text-sm font-bold w-12 shrink-0 ${q.score >= 7 ? 'text-emerald-600' : q.score >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
                      {q.score}/10
                    </span>
                    <p className="text-slate-600 text-sm line-clamp-1 flex-1 font-medium">{q.question}</p>
                  </div>
                ))}
              </div>

              <Button onClick={handleReset} variant="secondary" className="gap-2">
                <RotateCcw className="w-4 h-4" /> Start New Session
              </Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};