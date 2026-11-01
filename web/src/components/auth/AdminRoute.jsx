import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Spinner';

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <Spinner center label="Checking admin permissions..." />;
  }

  if (!user) {
    return <Navigate to="/login?next=/admin" replace />;
  }

  // Display guard only; database functions enforce SECURITY DEFINER admin checks
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
