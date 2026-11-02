import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { Toast } from '../components/ui/Toast';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifiedBanner = searchParams.get('verified') === '1';
  const nextUrl = searchParams.get('next') || '/';

  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);

  const [toastMsg, setToastMsg] = useState(verifiedBanner ? 'Email confirmed! Please sign in with your credentials.' : '');
  const [toastType, setToastType] = useState('success');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsUnconfirmed(false);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await signIn({ email, password });

      if (error) {
        const lower = (error.message || '').toLowerCase();
        if (lower.includes('email not confirmed') || lower.includes('unconfirmed')) {
          setIsUnconfirmed(true);
          setErrorMsg('Your campus email has not been verified yet. Please check your inbox or click below to resend the link.');
        } else if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
          setErrorMsg('Invalid campus email or password. Please double check and try again.');
        } else {
          setErrorMsg(error.message || 'Unable to sign in. Please try again.');
        }
        return;
      }

      // Successful sign in, redirect to intended page
      navigate(decodeURIComponent(nextUrl), { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected sign in error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim() || !email.includes('@')) {
      setToastMsg('Please enter your email above before requesting a resend.');
      setToastType('danger');
      return;
    }

    setResending(true);
    try {
      const siteUrl = window.location.origin;
      const redirectUrl = `${siteUrl}/login?verified=1`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setToastMsg(error.message || 'Failed to resend confirmation link.');
        setToastType('danger');
      } else {
        setToastMsg('A new confirmation link has been sent to your email.');
        setToastType('success');
      }
    } catch (err) {
      setToastMsg(err.message || 'Error resending confirmation link.');
      setToastType('danger');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)', maxWidth: '440px' }}>
      <Toast
        message={toastMsg}
        type={toastType}
        onClose={() => setToastMsg('')}
      />

      <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', textAlign: 'center', marginBottom: 'var(--space-2)' }}>
        Sign In
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--color-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
        Log in with your verified campus email.
      </p>

      <Card>
        {verifiedBanner && !errorMsg && (
          <div style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--space-4)',
            textAlign: 'center'
          }}>
            ✓ Email verified! You can now sign in below.
          </div>
        )}

        {errorMsg && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <ErrorState
              title={isUnconfirmed ? 'Email Not Verified' : 'Sign In Error'}
              message={errorMsg}
            />
            {isUnconfirmed && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={handleResendConfirmation}
                  loading={resending}
                >
                  Resend Verification Email
                </Button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <Field
            label="Campus Email"
            type="email"
            placeholder="you@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Field
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" variant="primary" fullWidth loading={submitting} style={{ marginTop: 'var(--space-2)' }}>
            Sign In
          </Button>

          {/* Quick 1-Click Demo Accounts */}
          <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-navy)', textAlign: 'center', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ 1-Click Quick Demo Sign In
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-2)' }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth
                style={{ justifyContent: 'flex-start', padding: 'var(--space-2) var(--space-3)' }}
                onClick={() => {
                  setEmail('kushagrasingh@gmail.com');
                  setPassword('Demo@1234');
                  signIn({ email: 'kushagrasingh@gmail.com', password: 'Demo@1234' }).then(() => {
                    navigate(decodeURIComponent(nextUrl), { replace: true });
                  });
                }}
              >
                👤 Sign in as <strong>Kushagra Singh Tomar</strong> (Buyer)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth
                style={{ justifyContent: 'flex-start', padding: 'var(--space-2) var(--space-3)' }}
                onClick={() => {
                  setEmail('bhagyeshjain@gmail.com');
                  setPassword('Demo@1234');
                  signIn({ email: 'bhagyeshjain@gmail.com', password: 'Demo@1234' }).then(() => {
                    navigate(decodeURIComponent(nextUrl), { replace: true });
                  });
                }}
              >
                👤 Sign in as <strong>Bhagyesh Jain</strong> (Seller)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth
                style={{ justifyContent: 'flex-start', padding: 'var(--space-2) var(--space-3)' }}
                onClick={() => {
                  setEmail('admin@bookloop.test');
                  setPassword('Demo@1234');
                  signIn({ email: 'admin@bookloop.test', password: 'Demo@1234' }).then(() => {
                    navigate(decodeURIComponent(nextUrl), { replace: true });
                  });
                }}
              >
                🛡️ Sign in as <strong>BookLoop Admin</strong>
              </Button>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-4)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-navy)', fontWeight: 'var(--font-weight-semibold)' }}>
              Register
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
