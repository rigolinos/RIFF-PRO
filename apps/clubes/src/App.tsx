import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster as SonnerToaster } from '@riff/core/ui/sonner';
import { ProtectedRoute } from '@riff/core/routing/ProtectedRoute';
import { PublicRoute } from '@riff/core/routing/PublicRoute';
import { GlobalErrorBoundary } from '@riff/core/app/GlobalErrorBoundary';

const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const LegalPage = lazy(() => import('@/pages/LegalPage'));
const AcceptTerms = lazy(() => import('@/pages/AcceptTerms'));
const Communities = lazy(() => import('@/pages/Communities'));
const Community = lazy(() => import('@/pages/Community'));
const NewActivity = lazy(() => import('@/pages/NewActivity'));
const Manage = lazy(() => import('@/pages/Manage'));
const ActivityRoster = lazy(() => import('@/pages/ActivityRoster'));
const Dependents = lazy(() => import('@/pages/Dependents'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg">
    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <SonnerToaster theme="system" position="top-center" />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
                <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
                <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
                <Route path="/termos" element={<LegalPage />} />
                <Route path="/privacidade" element={<LegalPage />} />
                <Route path="/termo-responsavel" element={<LegalPage />} />
                <Route path="/aceite" element={<ProtectedRoute skipLegal><AcceptTerms /></ProtectedRoute>} />
                <Route path="/inicio" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
                <Route path="/dependentes" element={<ProtectedRoute><Dependents /></ProtectedRoute>} />
                <Route path="/c/:orgId" element={<ProtectedRoute><Community /></ProtectedRoute>} />
                <Route path="/c/:orgId/nova" element={<ProtectedRoute><NewActivity /></ProtectedRoute>} />
                <Route path="/c/:orgId/gestao" element={<ProtectedRoute><Manage /></ProtectedRoute>} />
                <Route path="/c/:orgId/atividade/:sessionId" element={<ProtectedRoute><ActivityRoster /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </MotionConfig>
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
