import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { BattlePlan } from './pages/BattlePlan';
import { MockInterview } from './pages/MockInterview';
import { AgentTraces } from './pages/AgentTraces';
import { TPCDashboard } from './pages/TPCDashboard';
import { TPCStudentDetail } from './pages/TPCStudentDetail';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      
      {/* Protected App Routes */}
      <Route path="/app" element={<AppLayout />}>
        {/* Smart redirect based on role */}
        <Route index element={<Navigate to={user?.role === 'tpc' ? "/app/tpc" : "/app/dashboard"} replace />} />
        
        {/* ── STUDENT ROUTES ── */}
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="plan" element={<BattlePlan />} />
        <Route path="interview" element={<MockInterview />} />
        <Route path="traces" element={<AgentTraces />} />

        {/* ── TPC ADMIN ROUTES ── */}
        <Route path="tpc" element={<TPCDashboard />} />
        <Route path="tpc/student/:id" element={<TPCStudentDetail />} />
        <Route path="tpc/alerts" element={<TPCDashboard />} />
        <Route path="tpc/students" element={<TPCDashboard />} />
        <Route path="tpc/traces" element={<AgentTraces />} />
      </Route>

      {/* Fallback: any unknown path → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;