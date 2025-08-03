import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CropsPage from './pages/crops/CropsPage';
import CropDetailPage from './pages/crops/CropDetailPage';
import MyCropsPage from './pages/crops/MyCropsPage';
import CreateCropPage from './pages/crops/CreateCropPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import CreateExpensePage from './pages/expenses/CreateExpensePage';
import SensorsPage from './pages/sensors/SensorsPage';
import SensorDetailPage from './pages/sensors/SensorDetailPage';
import WeatherPage from './pages/weather/WeatherPage';
import TipsPage from './pages/tips/TipsPage';
import TipDetailPage from './pages/tips/TipDetailPage';
import ChatPage from './pages/chat/ChatPage';
import ChatDetailPage from './pages/chat/ChatDetailPage';
import CropAdvisorPage from './pages/advisor/CropAdvisorPage';
import ReportsPage from './pages/reports/ReportsPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/tips" element={<TipsPage />} />
            <Route path="/tips/:id" element={<TipDetailPage />} />
            <Route path="/crops" element={<CropsPage />} />
            <Route path="/crops/:id" element={<CropDetailPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Farmer Routes */}
            <Route
              path="/my-crops"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <MyCropsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/crops/create"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <CreateCropPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <ExpensesPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/create"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <CreateExpensePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sensors"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <SensorsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sensors/:id"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <SensorDetailPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/weather"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <WeatherPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/advisor"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <CropAdvisorPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <Layout>
                    <ReportsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Chat Routes */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ChatPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ChatDetailPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Profile Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch all route */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
