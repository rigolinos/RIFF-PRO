import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { MotionConfig } from 'framer-motion';

// Config
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { BottomNav } from '@/components/layout/BottomNav';
import { ModeBanner } from '@/components/layout/ModeBanner';
import { ViewModeProvider } from '@/contexts/ViewModeContext';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';

// Pages - Auth & Public
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const AcceptTerms = lazy(() => import('@/pages/AcceptTerms'));

// Pages - App Core
const OnboardingPro = lazy(() => import('@/pages/OnboardingPro'));
const OnboardingStudent = lazy(() => import('@/pages/OnboardingStudent'));
const CreateSession = lazy(() => import('@/pages/CreateSession'));
const EditSession = lazy(() => import('@/pages/EditSession'));
const SessionDetails = lazy(() => import('@/pages/SessionDetails'));
const SessionAttendance = lazy(() => import('@/pages/SessionAttendance'));
const Feed = lazy(() => import('@/pages/Feed'));
const MyBookings = lazy(() => import('@/pages/MyBookings'));
const MySessionsPro = lazy(() => import('@/pages/MySessionsPro'));
const DashboardPro = lazy(() => import('@/pages/DashboardPro'));
const ProfessionalProfile = lazy(() => import('@/pages/ProfessionalProfile'));
const ProfileEdit = lazy(() => import('@/pages/ProfileEdit'));
import Explore from '@/pages/Explore';
const Earnings = lazy(() => import('@/pages/Earnings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ViewModeProvider>
            <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              {/* Global UI Components */}
              <SonnerToaster theme="system" position="top-center" />
              <ModeBanner />

            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>}>
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              <Route path="/termos" element={<LegalPage />} />
              <Route path="/termos-organizador" element={<LegalPage />} />
              <Route path="/privacidade" element={<LegalPage />} />
              <Route path="/aceite" element={<ProtectedRoute skipLegal><AcceptTerms /></ProtectedRoute>} />
              
              {/* Public Profiles & Sessions */}
              <Route path="/pro/:slug" element={<ProfessionalProfile />} />
              <Route path="/:handle" element={<ProfessionalProfile />} />
              <Route path="/session/:id" element={<SessionDetails />} />
              <Route path="/session/:id/attendance" element={<ProtectedRoute><SessionAttendance /></ProtectedRoute>} />
              
              {/* Protected Routes - Onboarding */}
              <Route path="/onboarding/pro" element={<ProtectedRoute><OnboardingPro /></ProtectedRoute>} />
              <Route path="/onboarding/student" element={<ProtectedRoute><OnboardingStudent /></ProtectedRoute>} />

              {/* Protected Routes - App Core */}
              <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
              <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
              
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPro /></ProtectedRoute>} />
              <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
              <Route path="/create-session" element={<ProtectedRoute><CreateSession /></ProtectedRoute>} />
              <Route path="/edit-session/:id" element={<ProtectedRoute><EditSession /></ProtectedRoute>} />
              <Route path="/my-sessions" element={<ProtectedRoute><MySessionsPro /></ProtectedRoute>} />
              
              <Route path="/profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
              </Suspense>
            
            {/* Navigation */}
            <BottomNav />
            </MotionConfig>
          </ViewModeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
