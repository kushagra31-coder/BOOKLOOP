import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [studyType, setStudyType] = useState('college'); // 'college' | 'school'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [courseOrClass, setCourseOrClass] = useState('');

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadInstitutions() {
      try {
        const { data, error } = await supabase
          .from('institutions')
          .select('id, name, city, institution_type')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setInstitutions(data || []);
      } catch (err) {
        console.error('Error fetching institutions:', err);
        setErrorMsg('Unable to load institutions. Please check your connection.');
      } finally {
        setLoadingInstitutions(false);
      }
    }

    loadInstitutions();
  }, []);

  // Filter institutions based on School vs. College selection
  const filteredInstitutions = institutions.filter(
    (inst) => (inst.institution_type || 'college') === studyType
  );

  const handleStudyTypeChange = (newType) => {
    setStudyType(newType);
    // If current selected institution does not match new type, clear selection
    const stillValid = institutions.some(
      (inst) => inst.id === institutionId && (inst.institution_type || 'college') === newType
    );
    if (!stillValid) {
      setInstitutionId('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid campus email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!institutionId) {
      setErrorMsg(`Please select your ${studyType === 'school' ? 'school' : 'college / university'}.`);
      return;
    }

    setSubmitting(true);
    try {
      const siteUrl = window.location.origin;
      const redirectUrl = `${siteUrl}/login?verified=1`;

      const { data, error } = await signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            institution_id: institutionId,
            course_or_class: courseOrClass.trim() || null,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          setErrorMsg('An account with this email already exists. Please sign in instead.');
        } else {
          setErrorMsg(error.message || 'Registration failed. Please check your details and try again.');
        }
        return;
      }

      navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4)', maxWidth: '480px' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', textAlign: 'center', marginBottom: 'var(--space-2)' }}>
        Create an Account
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--color-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
        Join your campus second-hand book community.
      </p>

      <Card>
        {errorMsg && (
          <ErrorState
            title="Registration Error"
            message={errorMsg}
          />
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* First field: "I study at" School / College choice */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: 'var(--space-2)',
              }}
            >
              I study at <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className={`button ${studyType === 'college' ? 'button--primary' : 'button--outline'}`}
                style={{ justifyContent: 'center' }}
                onClick={() => handleStudyTypeChange('college')}
                aria-pressed={studyType === 'college'}
              >
                🎓 College / University
              </button>
              <button
                type="button"
                className={`button ${studyType === 'school' ? 'button--primary' : 'button--outline'}`}
                style={{ justifyContent: 'center' }}
                onClick={() => handleStudyTypeChange('school')}
                aria-pressed={studyType === 'school'}
              >
                🎒 School
              </button>
            </div>
          </div>

          {/* Filtered Institution Select */}
          <Field
            label={studyType === 'school' ? 'School' : 'College / University'}
            as="select"
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            required
            disabled={loadingInstitutions}
            hint={`Showing active ${studyType === 'school' ? 'schools' : 'colleges & universities'}.`}
          >
            <option value="">
              {loadingInstitutions
                ? 'Loading institutions...'
                : filteredInstitutions.length === 0
                ? `-- No ${studyType}s found --`
                : `-- Select your ${studyType === 'school' ? 'school' : 'college'} --`}
            </option>
            {filteredInstitutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} {inst.city ? `(${inst.city})` : ''}
              </option>
            ))}
          </Field>

          <Field
            label="Display Name"
            placeholder="e.g. Aarav Mehta"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <Field
            label="Campus Email"
            type="email"
            placeholder={studyType === 'school' ? 'student@school.edu' : 'you@college.edu'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            hint="We will send a confirmation link to this address."
          />

          <Field
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            hint="Must be at least 8 characters long."
          />

          <Field
            label={studyType === 'school' ? 'Class / Grade (Optional)' : 'Course / Department (Optional)'}
            placeholder={studyType === 'school' ? 'e.g. Class 11 - Science' : 'e.g. B.Tech CSE, 2nd Year'}
            value={courseOrClass}
            onChange={(e) => setCourseOrClass(e.target.value)}
            hint="Helps peers find relevant textbooks."
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={submitting}
            style={{ marginTop: 'var(--space-2)' }}
          >
            Create Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-navy)', fontWeight: 'var(--font-weight-semibold)' }}>
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}
