import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import './ContactPage.css';

export function ContactPage() {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setToast({ message: 'Please fill in all required fields.', variant: 'error' });
      return;
    }

    if (message.length > 2000) {
      setToast({ message: 'Message exceeds the 2000-character limit.', variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('submit_contact_message', {
        p_name: name.trim(),
        p_email: email.trim(),
        p_message: message.trim(),
      });

      if (error) throw error;

      setSubmitted(true);
    } catch (err) {
      console.error('Contact submission error:', err);
      setToast({
        message: err.message || 'Unable to deliver message. Please try again.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail(user?.email || '');
    setMessage('');
    setSubmitted(false);
  };

  return (
    <div className="contact-page">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <header className="contact-header">
        <h1 className="contact-title">Contact Administrator</h1>
        <p className="contact-subtitle">
          Have questions, feedback, or need moderation support? Send us a message and our campus team will get back to you.
        </p>
      </header>

      <Card>
        {submitted ? (
          <div className="contact-success-card">
            <div className="contact-success-icon" aria-hidden="true">✉️</div>
            <h2 className="contact-success-title">Message Received</h2>
            <p className="contact-success-text">
              Thank you for reaching out! Your message has been routed to our campus moderation team. We typically respond within 1–2 business days.
            </p>
            <Button variant="outline" onClick={handleReset}>
              Send Another Message
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="contact-form">
            <Field
              label="Your Full Name"
              placeholder="e.g. Aarav Mehta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Field
              label="Email Address"
              type="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <Field
                label="Message (max 2000 characters)"
                as="textarea"
                rows={5}
                placeholder="Describe your question, campus institution request, or issue in detail..."
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <div className="contact-char-count">
                {message.length} / 2000
              </div>
            </div>

            <Button type="submit" variant="primary" loading={loading} fullWidth>
              Send Message
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
