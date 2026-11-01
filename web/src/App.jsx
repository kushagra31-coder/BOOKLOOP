import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { Layout } from './components/layout/Layout';

import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { SellPage } from './pages/SellPage';
import { EditListingPage } from './pages/EditListingPage';
import { RequestsPage } from './pages/RequestsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { SafetyPage } from './pages/SafetyPage';
import { ContactPage } from './pages/ContactPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="book/:id" element={<BookDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="safety" element={<SafetyPage />} />
          <Route path="contact" element={<ContactPage />} />

          {/* Protected Routes (Authenticated Campus Users) */}
          <Route
            path="sell"
            element={
              <ProtectedRoute>
                <SellPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="sell/:id/edit"
            element={
              <ProtectedRoute>
                <EditListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="requests"
            element={
              <ProtectedRoute>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
