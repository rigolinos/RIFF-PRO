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
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/NotFound';

// Pages - App Core
import OnboardingPro from '@/pages/OnboardingPro';
import OnboardingStudent from '@/pages/OnboardingStudent';
import CreateSession from '@/pages/CreateSession';
import EditSession from '@/pages/EditSession';
import SessionDetails from '@/pages/SessionDetails';
import SessionAttendance from '@/pages/SessionAttendance';
import Feed from '@/pages/Feed';
import MyBookings from '@/pages/MyBookings';
import MySessionsPro from '@/pages/MySessionsPro';
import DashboardPro from '@/pages/DashboardPro';
import ProfessionalProfile from '@/pages/ProfessionalProfile';
import ProfileEdit from '@/pages/ProfileEdit';
import Explore from '@/pages/Explore';
import Earnings from '@/pages/Earnings';

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

            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              
              {/* Public Profiles & Sessions */}
              <Route path="/pro/:slug" element={<ProfessionalProfile />} />
              <Route path="/@:slug" element={<ProfessionalProfile />} />
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
