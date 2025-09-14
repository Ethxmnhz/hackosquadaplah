import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { useAuth } from './hooks/useAuth';
import AuthGuard from './components/guards/AuthGuard';
import GuestGuard from './components/guards/GuestGuard';
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
import ThreatIntelligencePage from './pages/dashboard/ThreatIntelligencePage';
import SkillPathsPage from './pages/skillpaths/SkillPathsPage';
import SkillPathPage from './pages/skillpaths/SkillPathPage';

// Team Pages
import LobbyPage from './redvsblue/pages/LobbyPage';
import OperationsListPage from './pages/redvsblue/OperationsListPage';
import MatchmakingPage from './redvsblue/pages/MatchmakingPage';
import LabInterfacePage from './redvsblue/pages/LabInterfacePage';

// Operations Pages
import OperationsPage from './pages/operations/OperationsPage';

// Creator Pages
import CreateChallengePage from './pages/creator/CreateChallengePage';
import ManageChallengesPage from './pages/creator/ManageChallengesPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import LabsManagement from './pages/admin/LabsManagement';
import CreateLabPage from './pages/admin/CreateLabPage';
import EditLabPage from './pages/admin/EditLabPage';
import EditChallengePage from './pages/admin/EditChallengePage';
import OperationsManagementPage from './pages/admin/OperationsManagementPage';
import SkillPathsManagement from './pages/admin/SkillPathsManagement';
import CreateSkillPathPage from './pages/admin/CreateSkillPathPage';
import LabOperation from './pages/admin/LabOperation';

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
    <>
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
              <Route path="/skill-paths" element={<SkillPathsPage />} />
              <Route path="/skill-paths/:id" element={<SkillPathPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/threat-intelligence" element={<ThreatIntelligencePage />} />
              
              {/* Operations Routes */}
              <Route path="/operations" element={<OperationsPage />} />
              <Route path="/red-vs-blue" element={<LobbyPage />} />
              <Route path="/red-vs-blue/operations" element={<OperationsListPage />} />
              <Route path="/red-vs-blue/matchmaking/:id" element={<MatchmakingPage />} />
              <Route path="/red-vs-blue/lab/:id" element={<LabInterfacePage />} />
// ...existing code...
              
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
                <Route path="/admin/labs/edit/:id" element={<EditLabPage />} />
                <Route path="/admin/challenges/edit/:id" element={<EditChallengePage />} />
                <Route path="/admin/skill-paths" element={<SkillPathsManagement />} />
                <Route path="/admin/skill-paths/create" element={<CreateSkillPathPage />} />
                <Route path="/creator/edit/:id" element={<EditChallengePage />} />
                <Route path="/admin/operations" element={<OperationsManagementPage />} />
                <Route path="/admin/laboperations" element={<LabOperation />} />
              </Route>
            </Route>
          </Route>

          {/* Redirect root to dashboard or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;