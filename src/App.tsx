import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from "./app/auth/services/useAuth";
import { setAuthToken } from './api/client';

import LoginPage from "./app/auth/pages/login-page/LoginPage";
import Layout from '@/components/layout/Layout';
import FullWidthLayout from '@/components/layout/FullWidthLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Lazy loaded pages
const SubstancesPage       = lazy(() => import('@/pages/substances/SubstancesPage'));
const SubstanceDetail      = lazy(() => import('@/pages/substances/SubstanceDetail'));
const AnalysisDetailPage   = lazy(() => import('@/pages/substances/AnalysisDetailPage'));
const ClassificationsPage  = lazy(() => import('@/pages/classifications/ClassificationsPage'));
const ModelsPage           = lazy(() => import('@/pages/models/ModelsPage'));
const AdminPage            = lazy(() => import('@/pages/admin/AdminPage'));
const OptimizerPage        = lazy(() => import('@/pages/optimizer/OptimizerPage'));
const GCxGCPage            = lazy(() => import('@/pages/gcxgc/GCxGCPage'));
const ProjectsPage         = lazy(() => import('@/pages/projects/ProjectsPage'));
const SimilarityPage       = lazy(() => import('@/pages/similarity/SimilarityPage'));
const NewAnalysisPage = lazy(() => import('@/pages/substances/NewAnalysisPage'));

export default function App() {
  const { initializing, authenticated, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setAuthToken(token ?? null);
  }, [token]);

  useEffect(() => {
    if (authenticated) {
      const returnPath = sessionStorage.getItem('kc-return-path');
      if (returnPath && returnPath !== '/') {
        sessionStorage.removeItem('kc-return-path');
        navigate(returnPath, { replace: true });
      }
    }
  }, [authenticated, navigate]);

  if (initializing) return <LoadingScreen />;
  if (!authenticated) return <LoginPage />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Optimizer: own full-width layout, no outer sidebar */}
        <Route
          path="/optimizer"
          element={
            <FullWidthLayout title="Optimizer">
              <OptimizerPage />
            </FullWidthLayout>
          }
        />

        {/* ML / Similarity Search: own full-width layout, no outer sidebar */}
        <Route
          path="/similarity"
          element={
            <FullWidthLayout title="Similarity Search">
              <SimilarityPage />
            </FullWidthLayout>
          }
        />

        {/* Everything else: shared sidebar Layout, as before */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/"                 element={<Navigate to="/substances" replace />} />
                <Route path="/substances"       element={<SubstancesPage />} />
                <Route path="/substances/:name" element={<SubstanceDetail />} />
                <Route path="/analyses/:id"     element={<AnalysisDetailPage />} />
                <Route path="/classifications"  element={<ClassificationsPage />} />
                <Route path="/models"           element={<ModelsPage />} />
                <Route path="/admin/*"          element={<AdminPage />} />
                <Route path="/gcxgc"            element={<GCxGCPage />} />
                <Route path="/projects"         element={<ProjectsPage />} />
                <Route path="/substances/:name/analyses/new" element={<NewAnalysisPage />} />
                <Route path="*"                 element={<Navigate to="/substances" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Suspense>
  );
}