import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { ErrorState } from '../components/ui/ErrorState';
import { Spinner } from '../components/ui/Spinner';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, privateProfile, signOut, refreshProfile, loading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [courseOrClass, setCourseOrClass] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [institutions, setInstitutions] = useState([]);
  const [loadingInst, setLoadingInst] = useState(true);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');
  const [errorMsg, setErrorMsg] = useState('');

  // Populate state when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setInstitutionId(profile.institution_id || '');
      setCourseOrClass(profile.course_or_class || '');
      setGraduationYear(profile.graduation_year ? String(profile.graduation_year) : '');
    }
  }, [profile]);

  useEffect(() => {
    if (privateProfile) {
      setWhatsapp(privateProfile.whatsapp_number || '');
    }
  }, [privateProfile]);

  // Load active institutions
  useEffect(() => {
    async function fetchInstitutions() {
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
      } finally {
        setLoadingInst(false);
      }
    }

    fetchInstitutions();
  }, []);

  // Fetch blocked users
  const fetchBlockedUsers = async () => {
    if (!user) return;
    setLoadingBlocked(true);
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocked_id, blocked:profiles!blocked_id(id, display_name)')
        .eq('blocker_id', user.id);

      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (err) {
      console.error('Failed to load blocked users:', err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [user]);

  const handleUnblockUser = async (blockedId) => {
    setUnblockingId(blockedId);
    try {
      const { error } = await supabase.rpc('unblock_user', {
        p_blocked_id: blockedId,
      });

      if (error) throw error;

      setToastMsg('User unblocked successfully.');
      setToastType('info');
      await fetchBlockedUsers();
    } catch (err) {
      console.error('Failed to unblock user:', err);
      setToastMsg(err.message || 'Unable to unblock user.');
      setToastType('danger');
    } finally {
      setUnblockingId(null);
    }
  };

  if (loading) {
    return <Spinner center label="Loading profile..." />;
  }

  // Format and validate WhatsApp number (+91XXXXXXXXXX)
  const formatWhatsappNumber = (raw) => {
    const cleaned = raw.trim().replace(/[\s-]/g, '');
    if (!cleaned) return null;

    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    // If entered 10-digit Indian mobile number e.g. 9876543210
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    // If starts with 91 followed by 10 digits
    if (/^91[6-9]\d{9}$/.test(cleaned)) {
      return `+${cleaned}`;
    }
    return cleaned;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }
    if (!institutionId) {
      setErrorMsg('Institution is required.');
      return;
    }

    let gradYearNum = null;
    if (graduationYear.trim()) {
      gradYearNum = parseInt(graduationYear.trim(), 10);
      if (isNaN(gradYearNum) || gradYearNum < 1990 || gradYearNum > 2100) {
        setErrorMsg('Graduation year must be a 4-digit year between 1990 and 2100.');
        return;
      }
    }

    let formattedWa = null;
    if (whatsapp.trim()) {
      formattedWa = formatWhatsappNumber(whatsapp);
      const e164Regex = /^\+[1-9][0-9]{9,14}$/;
      if (!e164Regex.test(formattedWa)) {
        setErrorMsg('Please enter a valid 10-digit mobile number for WhatsApp (e.g. +919876543210).');
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Update public profile
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          institution_id: institutionId,
          course_or_class: courseOrClass.trim() || null,
          graduation_year: gradYearNum,
        })
        .eq('id', user.id);

      if (profErr) throw profErr;

      // 2. Update private profile (column-level grant on whatsapp_number)
      const { error: privErr } = await supabase
        .from('profile_private')
        .update({
          whatsapp_number: formattedWa,
        })
        .eq('user_id', user.id);

      if (privErr) throw privErr;

      await refreshProfile();
      setToastMsg('Profile updated successfully!');
      setToastType('success');
    } catch (err) {
      console.error('Save error:', err);
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('request_account_deletion');
      if (error) throw error;

      await signOut();
      navigate('/login');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request account deletion.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '640px' }}>
      <Toast
        message={toastMsg}
        type={toastType}
        onClose={() => setToastMsg('')}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', margin: 0 }}>
          My Profile
        </h1>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      {errorMsg && (
        <ErrorState
          title="Profile Error"
          message={errorMsg}
          className="mb-4"
        />
      )}

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Card interactive onClick={() => navigate('/requests')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy)' }}>My Requests</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>Incoming & outgoing interest</div>
            </div>
            <span style={{ fontSize: '1.25rem' }}>📬 →</span>
          </div>
        </Card>

        <Card interactive onClick={() => navigate('/sell')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy)' }}>Sell Textbooks</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>Create a new book listing</div>
            </div>
            <span style={{ fontSize: '1.25rem' }}>📚 +</span>
          </div>
        </Card>
      </div>

      {/* Profile Details Edit Form */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-4)' }}>
          Student Information
        </h2>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
          <Field
            label="Campus Email (Read-only)"
            type="email"
            value={user?.email || ''}
            disabled
            hint="Account verification email linked to this student profile."
          />

          <Field
            label="Display Name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          {(() => {
            const currentInst = institutions.find((i) => i.id === institutionId);
            return (
              <Field
                label="Institution / Campus"
                as="select"
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                required
                disabled={loadingInst}
                hint={
                  currentInst
                    ? `Type: ${currentInst.institution_type === 'school' ? '🎒 School' : '🎓 College / University'}${currentInst.city ? ` • ${currentInst.city}` : ''}`
                    : 'Select your school or college campus.'
                }
              >
                <option value="">-- Select campus --</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.institution_type === 'school' ? 'School' : 'College'}{inst.city ? `, ${inst.city}` : ''})
                  </option>
                ))}
              </Field>
            );
          })()}

          <Field
            label="Course / Class"
            placeholder="e.g. B.Tech CSE, 3rd Year"
            value={courseOrClass}
            onChange={(e) => setCourseOrClass(e.target.value)}
            hint="Optional: helps campus buyers identify textbook relevance."
          />

          <Field
            label="Graduation Year"
            type="number"
            placeholder="e.g. 2027"
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
            min={1990}
            max={2100}
            hint="Optional: 4-digit expected graduation year."
          />

          <Field
            label="WhatsApp Number (+91XXXXXXXXXX)"
            type="tel"
            placeholder="+919876543210"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            hint="Only shared with a buyer whose request you accept."
          />

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button type="submit" variant="primary" loading={saving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Blocked Users Section */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
          Blocked Users
        </h2>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
          Users you have blocked cannot interact with your listings or message you.
        </p>

        {loadingBlocked ? (
          <Spinner size="sm" label="Loading blocked users..." />
        ) : blockedUsers.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
            You have not blocked any users.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {blockedUsers.map((item) => (
              <li
                key={item.blocked_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)' }}>
                  🚫 {item.blocked?.display_name || 'Campus Student'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unblockingId === item.blocked_id}
                  onClick={() => handleUnblockUser(item.blocked_id)}
                >
                  {unblockingId === item.blocked_id ? 'Unblocking...' : 'Unblock'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Account Deletion Danger Zone */}
      <Card style={{ border: '1px solid #FECACA', backgroundColor: '#FFF5F5' }}>
        <h2 style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-danger)', marginBottom: 'var(--space-1)' }}>
          Danger Zone
        </h2>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)', lineHeight: 'var(--line-height-normal)' }}>
          Requesting account deletion will deactivate your account, hide all active listings, and close open requests.
        </p>

        {!confirmDelete ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            Request Account Deletion
          </Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Are you sure? This action will disable your student profile.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteAccount}
                loading={deleting}
              >
                Yes, Delete My Account
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
