import { useEffect, lazy, Suspense } from 'react';
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

// Dashboard Pages (lazy-loaded for performance)
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ChallengesPage = lazy(() => import('./pages/challenges/ChallengesPage'));
const ChallengePage = lazy(() => import('./pages/challenges/ChallengePage'));
const LabsPage = lazy(() => import('./pages/labs/LabsPage'));
const LabPage = lazy(() => import('./pages/labs/LabPage'));
const CertificationsPage = lazy(() => import('./pages/certifications/CertificationsPage'));
const SkillPathPage = lazy(() => import('./pages/skillpaths/SkillPathPage'));

// Team Pages (lazy)
const OperationDetailsPage = lazy(() => import('./pages/redvsblue/OperationDetailsPage'));
const LabInterfacePage = lazy(() => import('./pages/redvsblue/LabInterfacePage'));

// Operations Pages (lazy)
const OperationsPage = lazy(() => import('./pages/operations/OperationsPage'));
const ArenaPage = lazy(() => import('./pages/operations/ArenaPage'));
const OperationSessionPage = lazy(() => import('./pages/operations/SessionPage'));

// Creator Pages (lazy)
const CreateChallengePage = lazy(() => import('./pages/creator/CreateChallengePage'));
const ManageChallengesPage = lazy(() => import('./pages/creator/ManageChallengesPage'));

// Admin Pages (lazy)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const LabsManagement = lazy(() => import('./pages/admin/LabsManagement'));
const CreateLabPage = lazy(() => import('./pages/admin/CreateLabPage'));
const EditLabPage = lazy(() => import('./pages/admin/EditLabPage'));
const EditChallengePage = lazy(() => import('./pages/admin/EditChallengePage'));
const OperationsManagementPage = lazy(() => import('./pages/admin/OperationsManagementPage'));
const CreateSkillPathPage = lazy(() => import('./pages/admin/CreateSkillPathPage')); // legacy create
const CertificationsManagement = lazy(() => import('./pages/admin/CertificationsManagement'));
const CreateCertificationPage = lazy(() => import('./pages/admin/CreateCertificationPage'));
const EditCertificationPage = lazy(() => import('./pages/admin/EditCertificationPage'));
const LabOperation = lazy(() => import('./pages/admin/LabOperation'));
const RedVsBlueSessionsAdminPage = lazy(() => import('./pages/admn/RedVsBlueSessionsAdminPage
  '));
const AdminDashboardPage = lazy(() => import('./pages/admin-dashboard/AdminDashboardPage'));
const OnchainTestPage = lazy(() => import('./pages/onchain/OnchainTestPage'));
const ClaimCertificatePage = lazy(() => import('./pages/certs/ClaimCerificate'));
const MyCertificatesPage = lazy(() => import('./pages/certs/MyCertificates'));
const VerifierPage = lazy(() => import('./pages/certs/Verifier
  '));

// Leaderboard Page (lazy)
const LeaderboardPage = lazy(() => import('./pages/leaderboard
  /LeaderboardPage'));

// Profile Page (lazy)
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const BillingPage = lazy(() => import('./pages/billing/index'));
const BillingAdminPage = lazy(() => import('./pages/admin/BillingAdminPage')); // placeholder
const SampleChallengePage = lazy(() => import('./pages/SampleChallenge'));

// Error Pages (lazy)
const NotFoundPage = lazy(() => import('./pages/error/NotFoundPage'));
const AccessDenied = lazy(() => import('./pages/error/AccessDenied'));
import LoadingScreen from './components/ui/LoadingScreen';

function App() {
  const { pathname } = useLocation();
  const { isInitialized } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!isInitialized) return <LoadingScreen message="Loading" subMessage="Establishing secure session..." />;

  return (
  <>
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingScreen message="Loading" subMessage="Fetching resources..." /> }>
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
              <Route path="/skill-paths" element={<CertificationsPage />} />
              <Route path="/skill-paths/:id" element={<SkillPathPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/billing" element={<BillingPage />} />
              {/* Gated Sample Page (temporary) */}
              <Route path="/sample-challenge" element={<SampleChallengePage />} />
              {/* Onchain Test Route */}
              <Route path="/onchain" element={<OnchainTestPage />} />
              {/* Claim Certificate */}
              <Route path="/certs/claim" element={<ClaimCertificatePage />} />
              {/* My Certificates */}
              <Route path="/certs/mine" element={<MyCertificatesPage />} />
              {/* Verifier Page */}
              <Route path="/certs/verify" element={<VerifierPage />} />
              {/* Threat Intelligence removed */}
              
              {/* Operations Routes */}
              <Route path="/operations" element={<OperationsPage />} />
              <Route path="/operations/arena" element={<ArenaPage />} />
              <Route path="/operations/session/:sessionId" element={<OperationSessionPage />} />
              <Route path="/operations/session/:sessionId/:team" element={<OperationSessionPage />} />
              
              {/* Redirect old Red vs Blue routes to new Arena */}
              <Route path="/red-vs-blue" element={<Navigate to="/operations/arena" replace />} />
              <Route path="/red-vs-blue/operations" element={<Navigate to="/operations/arena" replace />} />
              <Route path="/red-vs-blue/operations/:id" element={<OperationDetailsPage />} />
              <Route path="/red-vs-blue/matchmaking/:id" element={<Navigate to="/operations/arena" replace />} />
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
                <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/labs" element={<LabsManagement />} />
                <Route path="/admin/labs/create" element={<CreateLabPage />} />
                <Route path="/admin/labs/edit/:id" element={<EditLabPage />} />
                <Route path="/admin/challenges/edit/:id" element={<EditChallengePage />} />
                {/* New Certifications Routes */}
                <Route path="/admin/certifications" element={<CertificationsManagement />} />
                <Route path="/admin/certifications/create" element={<CreateCertificationPage />} />
                <Route path="/admin/certifications/edit/:id" element={<EditCertificationPage />} />
                {/* Temporary: redirect old paths to new */}
                <Route path="/admin/skill-paths" element={<Navigate to="/admin/certifications" replace />} />
                <Route path="/admin/skill-paths/create" element={<CreateSkillPathPage />} />
                <Route path="/creator/edit/:id" element={<EditChallengePage />} />
                <Route path="/admin/operations" element={<OperationsManagementPage />} />
                <Route path="/admin/laboperations" element={<LabOperation />} />
                <Route path="/admin/RedVsBlueSessionsAdminPage" element={<RedVsBlueSessionsAdminPage />} />
                <Route path="/admin/billing" element={<BillingAdminPage />} />
              </Route>
            </Route>
          </Route>

          {/* Redirect root to dashboard or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Access Denied Route */}
          <Route path="/access-denied" element={<AccessDenied />} />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </AnimatePresence>
  </>
  );
}

export default App;
