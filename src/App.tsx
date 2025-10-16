import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { useAuth } from './hooks/useAuth';
import AuthGuard from './components/guards/AuthGuard';
import GuestGuard from './components/guards/GuesetGuard';
import AdminGuard from './components/guards/AdminGuard';

// Layouts
import DashboardLayout from './components/layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import ChallengesPage from './pages/challenges/ChallengesPage';
import ChallengePage from './pages/challenges/ChallengePage';
import LabsPage from './pages/labs/LabsPage';
import LabPage from './pages/labs/LabPage';

// Team Pages
import RedTeamPage from './pages/teams/RedTeamPage';
import BlueTeamPage from './pages/teams/BlueTeamPage';

// Operations Pages
import OperationsPage from './pages/operations/OperationsPage';

// Creator Pages
import CreateChallengePage from './pages/creator/CreateChallengePage';
import ManageChallengesPage from './pages/creator/ManageChallengesPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import LabsManagement from './pages/admin/LabsManagement';
import CreateLabPage from './pages/admin/CreateLabPage';
import OperationsManagementPage from './pages/admin/OperationsManagementPage';

// Leaderboard Page
import LeaderboardPage from './pages/leaderboard/LeaderboardPage';

// Profile Page
import ProfilePage from './pages/profile/ProfilePage';

// Error Pages
import NotFoundPage from './pages/error/NotFoundPage';

function App() {
  const { pathname } = useLocation();
  const { isInitialized } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="animate-pulse text-primary text-2xl">Loading HackoSquad...</div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Auth Routes */}
        <Route element={<GuestGuard />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Dashboard Routes */}
        <Route element={<AuthGuard />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/challenges/:id" element={<ChallengePage />} />
            <Route path="/labs" element={<LabsPage />} />
            <Route path="/labs/:id" element={<LabPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            
            {/* Operations Routes */}
            <Route path="/operations" element={<OperationsPage />} />
            <Route path="/red-team" element={<RedTeamPage />} />
            <Route path="/blue-team" element={<BlueTeamPage />} />
            
            {/* Creator Routes */}
            <Route path="/creator/create" element={<CreateChallengePage />} />
            <Route path="/creator/manage" element={<ManageChallengesPage />} />

            {/* Profile Route */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Admin Routes */}
            <Route element={<AdminGuard />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/labs" element={<LabsManagement />} />
              <Route path="/admin/labs/create" element={<CreateLabPage />} />
              <Route path="/admin/operations" element={<OperationsManagementPage />} />
            </Route>
          </Route>
        </Route>

        {/* Redirect root to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App
