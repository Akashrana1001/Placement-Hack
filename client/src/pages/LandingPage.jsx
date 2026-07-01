import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Brain, Shield, Zap, Users, Target, ArrowRight, Star, Activity, ChevronDown, Sparkles } from 'lucide-react';
import homepageImg from '../assets/homepage.png';

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ words }) {
  const [idx, setIdx] = useState(0);
  const [char, setChar] = useState(0);
  const [del, setDel] = useState(false);
  const word = words[idx % words.length];
  useEffect(() => {
    const t = setTimeout(() => {
      if (!del && char === word.length) { setTimeout(() => setDel(true), 1500); return; }
      if (del && char === 0) { setDel(false); setIdx(i => i + 1); return; }
      setChar(c => del ? c - 1 : c + 1);
    }, del ? 40 : 90);
    return () => clearTimeout(t);
  }, [char, del, word]);
  return <span className="text-cyber-cyan">{word.slice(0, char)}<span className="animate-pulse text-cyber-cyan/50">|</span></span>;
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let v = 0; const step = to / 120;
    const t = setInterval(() => { v += step; if (v >= to) { setN(to); clearInterval(t); } else setN(Math.floor(v)); }, 1000/60);
    return () => clearInterval(t);
  }, [to]);
  return <span>{n.toLocaleString()}</span>;
}

const FEATURES = [
  { icon: Brain, title: 'Custom ReAct AI', desc: 'Hand-built reasoning loop — no LangChain. Thinks, calls tools, and self-corrects.', accent: 'bg-sky-50 text-sky-600' },
  { icon: Zap, title: 'Sentinel Automation', desc: 'Autonomous cron agent monitors students 24/7 and fires real-time teacher alerts.', accent: 'bg-violet-50 text-violet-600' },
  { icon: Target, title: 'Battle Plans', desc: 'AI-generated week-by-week study roadmaps tailored to your exact skill gaps.', accent: 'bg-amber-50 text-amber-600' },
  { icon: Activity, title: 'Mock Interviews', desc: 'Instant technical & HR interviews with live scoring and keyword feedback.', accent: 'bg-emerald-50 text-emerald-600' },
  { icon: Shield, title: 'Fully Private', desc: 'Runs locally with Ollama or Groq — no data ever leaves your network.', accent: 'bg-rose-50 text-rose-600' },
  { icon: Users, title: 'TPC Dashboard', desc: 'Real-time teacher dashboard with Socket.io alerts and queue monitoring.', accent: 'bg-cyan-50 text-cyan-600' },
];

const STATS = [
  { value: 1000, suffix: '+', label: 'Students Analyzed' },
  { value: 50, suffix: 'ms', label: 'Interview Latency' },
  { value: 95, suffix: '%', label: 'Placement Boost' },
  { value: 3, suffix: '', label: 'AI Agents' },
];

const FLOW = [
  { step: '01', title: 'Upload Resume', desc: 'Paste text or drop a PDF/DOCX — parsed instantly.', color: 'bg-sky-500' },
  { step: '02', title: 'AI Analyzes', desc: 'ReAct orchestrator runs through tool chain in background.', color: 'bg-violet-500' },
  { step: '03', title: 'Gap Report', desc: 'Skills matched against target companies. Gaps highlighted.', color: 'bg-amber-500' },
  { step: '04', title: 'Battle Plan', desc: 'Personalized weekly roadmap generated automatically.', color: 'bg-emerald-500' },
  { step: '05', title: 'Sentinel Monitors', desc: 'Background cron watches progress and alerts teachers.', color: 'bg-rose-500' },
];

// ─────────────────────────────────────────────────────────────────────────────
export const LandingPage = () => {
  const navigate = useNavigate();

  const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-800 overflow-x-hidden">

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/60 backdrop-blur-2xl border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-200/50">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-800">PlacementPilot</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-500 font-medium">
          {['Features', 'How it Works', 'Stack'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
              className="hover:text-slate-800 transition-colors">{item}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors px-4 py-2 font-medium">
            Sign In
          </button>
          <button onClick={() => navigate('/login')}
            className="text-sm px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-slate-300/50 active:scale-[0.98]">
            Get Started
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center px-6 pt-24 overflow-hidden">
        {/* Soft gradient blobs */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-sky-100/80 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-violet-100/60 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 w-full">
          {/* Left: Text */}
          <div>
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 text-xs font-semibold border border-sky-100 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Autonomous AI Career Coach
              </span>
            </motion.div>

            <motion.h1 {...fadeUp} transition={{ delay: 0.2 }}
              className="text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight mb-6 text-slate-900">
              Your Placement,<br />
              <Typewriter words={['Reinvented.', 'Automated.', 'Guaranteed.']} />
            </motion.h1>

            <motion.p {...fadeUp} transition={{ delay: 0.3 }}
              className="text-lg text-slate-500 leading-relaxed mb-8 max-w-lg">
              Upload your resume. The AI analyzes gaps, builds a battle plan, 
              runs mock interviews, and alerts your teachers — all autonomously.
            </motion.p>

            <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/login')}
                className="group px-7 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all hover:shadow-xl hover:shadow-slate-300/40 active:scale-[0.98] flex items-center justify-center gap-2">
                Launch System
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a href="#features"
                className="px-7 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-medium text-sm hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                Explore Features
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div {...fadeUp} transition={{ delay: 0.5 }}
              className="flex items-center gap-6 mt-10 text-xs text-slate-400">
              {['100% Private', 'Zero API Costs', 'Runs Locally'].map((t, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-300/40">
              <img
                src={homepageImg}
                alt="PlacementPilot Interface"
                className="w-full h-[480px] object-cover animate-float"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent" />
            </div>

            {/* Floating stat card */}
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Agents Active</p>
                <p className="text-lg font-bold text-slate-800">3 / 3</p>
              </div>
            </motion.div>

            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -top-4 -right-4 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-slate-100 px-3 py-2 flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-slate-600">Sentinel Online</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-5 h-5 text-slate-300 animate-bounce" />
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="py-16 border-y border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="text-3xl font-extrabold text-slate-800 mb-1">
                <Counter to={s.value} /><span className="text-cyber-cyan">{s.suffix}</span>
              </div>
              <div className="text-sm text-slate-400">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.span {...fadeUp} className="text-xs font-semibold text-sky-500 tracking-widest uppercase mb-3 block">Capabilities</motion.span>
            <motion.h2 {...fadeUp} className="text-4xl font-extrabold text-slate-800 mb-4">Everything you need.</motion.h2>
            <motion.p {...fadeUp} className="text-slate-400 max-w-md mx-auto">A complete ecosystem — not a chatbot. Autonomous agents working together 24/7.</motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4 }}
                className="group p-6 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/80 transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${f.accent}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-slate-800 font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <motion.span {...fadeUp} className="text-xs font-semibold text-violet-500 tracking-widest uppercase mb-3 block">Pipeline</motion.span>
            <motion.h2 {...fadeUp} className="text-4xl font-extrabold text-slate-800 mb-4">How it works.</motion.h2>
            <motion.p {...fadeUp} className="text-slate-400 max-w-md mx-auto">From resume upload to real-time monitoring — fully autonomous.</motion.p>
          </div>

          <div className="space-y-4">
            {FLOW.map((f, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-5 p-5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-white hover:shadow-md transition-all duration-300 group"
              >
                <div className={`w-10 h-10 rounded-xl ${f.color} text-white flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-110 transition-transform`}>
                  {f.step}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-400">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STACK ─────────────────────────────────────────────────────────── */}
      <section id="stack" className="py-24 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.span {...fadeUp} className="text-xs font-semibold text-amber-500 tracking-widest uppercase mb-3 block">Technology</motion.span>
          <motion.h2 {...fadeUp} className="text-4xl font-extrabold text-slate-800 mb-12">Production-grade stack.</motion.h2>

          <motion.div {...fadeUp} className="flex flex-wrap justify-center gap-3">
            {['React', 'Vite', 'TailwindCSS', 'Framer Motion', 'Node.js', 'Express', 'MongoDB', 'Redis', 'BullMQ', 'Socket.io', 'Ollama', 'Groq', 'JWT', 'Multer'].map((tech, i) => (
              <motion.span key={i}
                whileHover={{ scale: 1.05, y: -2 }}
                className="px-4 py-2 rounded-xl bg-white border border-slate-150 text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:border-sky-200 hover:text-sky-600 transition-all cursor-default"
              >
                {tech}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-violet-50 pointer-events-none" />

        <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-5xl font-extrabold text-slate-800 mb-6 leading-tight">
            Ready to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-violet-500">take off?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-md mx-auto">
            Your placement journey starts with one click. Upload a resume and let the agents work.
          </p>

          <button onClick={() => navigate('/login')}
            className="group px-10 py-4 rounded-2xl bg-slate-900 text-white font-bold text-base hover:bg-slate-800 transition-all hover:shadow-2xl hover:shadow-slate-400/30 active:scale-[0.98] inline-flex items-center gap-3">
            <Rocket className="w-5 h-5" />
            Launch PlacementPilot
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
            <Rocket className="w-3 h-3 text-white" />
          </div>
          <span className="text-slate-800 font-semibold text-sm">PlacementPilot</span>
        </div>
        <p className="text-slate-400 text-xs">Built for the Hackathon · Fully Autonomous · Zero Compromise</p>
      </footer>
    </div>
  );
};
