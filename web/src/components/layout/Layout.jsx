import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

export function Layout() {
  const { user, profile } = useAuth();

  return (
    <div className="app-shell">
      {/* Desktop Top Header Navigation (>768px) */}
      <header className="desktop-header">
        <div className="container header-inner">
          <Link to="/" className="brand-logo" aria-label="BookLoop Home">
            <svg
              className="brand-icon"
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="8" fill="var(--color-navy)" />
              <path
                d="M8 10C8 8.89543 8.89543 8 10 8H15V24H10C8.89543 24 8 23.1046 8 22V10Z"
                fill="#FFFFFF"
                opacity="0.9"
              />
              <path
                d="M17 8H22C23.1046 8 24 8.89543 24 10V22C24 23.1046 23.1046 24 22 24H17V8Z"
                fill="var(--color-yellow)"
              />
              <circle cx="16" cy="16" r="3" fill="var(--color-navy)" />
            </svg>
            <span className="brand-text">
              <span className="brand-primary">Book</span>
              <span className="brand-accent">Loop</span>
            </span>
          </Link>

          <nav className="desktop-nav" aria-label="Main Navigation">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Search
            </NavLink>
            <NavLink to="/sell" className={({ isActive }) => `nav-link nav-link-sell ${isActive ? 'active' : ''}`}>
              + Sell
            </NavLink>
            {user ? (
              <>
                <NavLink to="/requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  Requests
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  {profile?.display_name || 'Profile'}
                </NavLink>
              </>
            ) : (
              <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Sign In
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile Top Header (<=768px) */}
      <header className="mobile-header">
        <div className="container mobile-header-inner">
          <Link to="/" className="brand-logo" aria-label="BookLoop Home">
            <svg
              className="brand-icon"
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="8" fill="var(--color-navy)" />
              <path
                d="M8 10C8 8.89543 8.89543 8 10 8H15V24H10C8.89543 24 8 23.1046 8 22V10Z"
                fill="#FFFFFF"
                opacity="0.9"
              />
              <path
                d="M17 8H22C23.1046 8 24 8.89543 24 10V22C24 23.1046 23.1046 24 22 24H17V8Z"
                fill="var(--color-yellow)"
              />
              <circle cx="16" cy="16" r="3" fill="var(--color-navy)" />
            </svg>
            <span className="brand-text">
              <span className="brand-primary">Book</span>
              <span className="brand-accent">Loop</span>
            </span>
          </Link>
          <div className="mobile-header-actions">
            <Link to="/sell" className="mobile-sell-btn" aria-label="Post Book for Sale">
              + Sell
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container footer-inner">
          <div className="footer-links">
            <Link to="/privacy" className="footer-link">Privacy</Link>
            <span className="footer-sep" aria-hidden="true">•</span>
            <Link to="/terms" className="footer-link">Terms</Link>
            <span className="footer-sep" aria-hidden="true">•</span>
            <Link to="/safety" className="footer-link">Safety</Link>
            <span className="footer-sep" aria-hidden="true">•</span>
            <Link to="/contact" className="footer-link">Contact Administrator</Link>
          </div>
          <p className="footer-credits" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-navy)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
            Developed by <strong>Kushagra Singh Tomar</strong> &amp; <strong>Bhagyesh Jain</strong> • Acropolis Institute of Technology and Research
          </p>
          <p className="footer-copy">
            © {new Date().getFullYear()} BookLoop. Campus peer-to-peer textbook marketplace.
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (<=768px) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <NavLink to="/" end className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon" aria-hidden="true">🏠</span>
          <span className="mobile-nav-label">Home</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon" aria-hidden="true">🔍</span>
          <span className="mobile-nav-label">Search</span>
        </NavLink>
        <NavLink to="/sell" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon" aria-hidden="true">➕</span>
          <span className="mobile-nav-label">Sell</span>
        </NavLink>
        <NavLink to={user ? "/profile" : "/login"} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <span className="mobile-nav-icon" aria-hidden="true">{user ? '👤' : '🔑'}</span>
          <span className="mobile-nav-label">{user ? 'Profile' : 'Sign In'}</span>
        </NavLink>
      </nav>
    </div>
  );
}
