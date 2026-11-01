import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [resending, setResending] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');

  const handleResend = async () => {
    if (!email.trim() || !email.includes('@')) {
      setToastMsg('Please enter a valid email address.');
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
        setToastMsg(error.message || 'Failed to resend confirmation email.');
        setToastType('danger');
      } else {
        setToastMsg('Confirmation link has been resent to your inbox!');
        setToastType('success');
      }
    } catch (err) {
      setToastMsg(err.message || 'An error occurred while resending.');
      setToastType('danger');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)', maxWidth: '480px' }}>
      <Toast
        message={toastMsg}
        type={toastType}
        onClose={() => setToastMsg('')}
      />

      <Card style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-soft-blue)',
          color: 'var(--color-navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          margin: '0 auto var(--space-4)'
        }}>
          ✉️
        </div>

        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
          Check Your Inbox
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-relaxed)', marginBottom: 'var(--space-4)' }}>
          We've sent a verification link to <strong>{email || 'your campus email'}</strong>. Click the link in the message to activate your student account.
        </p>

        <div style={{ background: 'var(--color-bg)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)', textAlign: 'left' }}>
          <Field
            label="Didn't get the email?"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Confirm your email"
            hint="Check your spam/junk folder or click below to resend."
          />

          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={handleResend}
            loading={resending}
          >
            Resend Confirmation Email
          </Button>
        </div>

        <Link to="/login" style={{ color: 'var(--color-navy)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
          ← Back to Sign In
        </Link>
      </Card>
    </div>
  );
}
