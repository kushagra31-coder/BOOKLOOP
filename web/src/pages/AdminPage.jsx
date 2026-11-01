import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import { Toast } from '../components/ui/Toast';
import { formatPaise } from '../lib/money';
import './AdminPage.css';

export function AdminPage() {
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('stats');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. Stats State
  const [stats, setStats] = useState(null);

  // 2. Reports State
  const [reports, setReports] = useState([]);
  const [reportFilter, setReportFilter] = useState('all');
  const [editingReport, setEditingReport] = useState(null);
  const [reportNotes, setReportNotes] = useState('');
  const [reportNewStatus, setReportNewStatus] = useState('reviewing');

  // 3. Listings State
  const [listings, setListings] = useState([]);
  const [listingSearch, setListingSearch] = useState('');
  const [hidingListingId, setHidingListingId] = useState(null);
  const [hideReason, setHideReason] = useState('');

  // 4. Users State
  const [users, setUsers] = useState([]);
  const [userStatusModal, setUserStatusModal] = useState(null); // { user, nextStatus }
  const [userStatusReason, setUserStatusReason] = useState('');

  // 5. Taxonomy State (Institutions & Categories)
  const [institutions, setInstitutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingInst, setEditingInst] = useState(null); // null or { id, name, ... }
  const [newCategoryName, setNewCategoryName] = useState('');

  // 6. Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);

  // 7. Contact Messages State
  const [messages, setMessages] = useState([]);

  const showToast = (message, variant = 'info') => {
    setToast({ message, variant });
  };

  // ── 1. Fetch Stats ──
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_stats');
      if (error) throw error;
      setStats(data || {});
    } catch (err) {
      console.error('Stats error:', err);
      showToast(err.message || 'Failed to load stats.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 2. Fetch Reports ──
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          reported_user_id,
          listing_id,
          reason,
          details,
          status,
          admin_notes,
          created_at,
          resolved_at,
          reporter:profiles!reporter_id(display_name),
          reported_user:profiles!reported_user_id(display_name),
          listing:listings(id, title)
        `)
        .order('created_at', { ascending: false });

      if (reportFilter !== 'all') {
        query = query.eq('status', reportFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Reports error:', err);
      showToast(err.message || 'Failed to load reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, [reportFilter]);

  // ── 3. Fetch Listings ──
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('listings')
        .select(`
          id,
          title,
          author,
          price_paise,
          condition,
          status,
          created_at,
          seller:profiles!seller_id(id, display_name),
          institution:institutions(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (listingSearch.trim()) {
        query = query.ilike('title', `%${listingSearch.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Listings error:', err);
      showToast(err.message || 'Failed to load listings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [listingSearch]);

  // ── 4. Fetch Users ──
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          course_or_class,
          graduation_year,
          created_at,
          institution:institutions(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Users error:', err);
      showToast(err.message || 'Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 5. Fetch Taxonomy ──
  const fetchTaxonomy = useCallback(async () => {
    setLoading(true);
    try {
      const [instRes, catRes] = await Promise.all([
        supabase.from('institutions').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (instRes.error) throw instRes.error;
      if (catRes.error) throw catRes.error;

      setInstitutions(instRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Taxonomy error:', err);
      showToast(err.message || 'Failed to load institutions & categories.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 6. Fetch Audit Logs ──
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Audit logs error:', err);
      showToast(err.message || 'Failed to load audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 7. Fetch Contact Messages ──
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Contact messages error:', err);
      showToast(err.message || 'Failed to load contact messages.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'listings') fetchListings();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'taxonomy') fetchTaxonomy();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'messages') fetchMessages();
  }, [activeTab, fetchStats, fetchReports, fetchListings, fetchUsers, fetchTaxonomy, fetchAuditLogs, fetchMessages]);

  // ── Admin Actions ──

  // Update Report Action
  const handleUpdateReport = async (e) => {
    e.preventDefault();
    if (!editingReport) return;

    try {
      const { error } = await supabase.rpc('admin_update_report', {
        p_report_id: editingReport.id,
        p_status: reportNewStatus,
        p_admin_notes: reportNotes.trim() || null,
      });

      if (error) throw error;

      showToast(`Report updated to ${reportNewStatus}.`, 'success');
      setEditingReport(null);
      setReportNotes('');
      await fetchReports();
    } catch (err) {
      console.error('Update report error:', err);
      showToast(err.message || 'Failed to update report.', 'error');
    }
  };

  // Hide Listing Action
  const handleHideListing = async (e) => {
    e.preventDefault();
    if (!hidingListingId) return;

    try {
      const { error } = await supabase.rpc('admin_hide_listing', {
        p_listing_id: hidingListingId,
        p_reason: hideReason.trim() || 'Moderator policy action',
      });

      if (error) throw error;

      showToast('Listing hidden successfully.', 'success');
      setHidingListingId(null);
      setHideReason('');
      await fetchListings();
    } catch (err) {
      console.error('Hide listing error:', err);
      showToast(err.message || 'Failed to hide listing.', 'error');
    }
  };

  // Set User Status Action (suspend/reactivate)
  const handleSetUserStatus = async (e) => {
    e.preventDefault();
    if (!userStatusModal) return;

    try {
      const { error } = await supabase.rpc('admin_set_user_status', {
        p_user_id: userStatusModal.user.id,
        p_status: userStatusModal.nextStatus,
        p_reason: userStatusReason.trim() || null,
      });

      if (error) throw error;

      showToast(`User status set to ${userStatusModal.nextStatus}.`, 'success');
      setUserStatusModal(null);
      setUserStatusReason('');
      await fetchUsers();
    } catch (err) {
      console.error('Set user status error:', err);
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  // Upsert Institution
  const handleUpsertInstitution = async (e) => {
    e.preventDefault();
    if (!editingInst) return;

    try {
      const { error } = await supabase.rpc('admin_upsert_institution', {
        p_id: editingInst.id || null,
        p_name: editingInst.name.trim(),
        p_institution_type: editingInst.institution_type || 'university',
        p_city: editingInst.city?.trim() || null,
        p_area: editingInst.area?.trim() || null,
        p_verification_method: editingInst.verification_method || 'email_domain',
        p_is_active: editingInst.is_active ?? true,
      });

      if (error) throw error;

      showToast('Campus institution saved.', 'success');
      setEditingInst(null);
      await fetchTaxonomy();
    } catch (err) {
      console.error('Upsert institution error:', err);
      showToast(err.message || 'Failed to save campus institution.', 'error');
    }
  };

  // Toggle Category Status
  const handleToggleCategory = async (cat) => {
    try {
      const { error } = await supabase.rpc('admin_upsert_category', {
        p_id: cat.id,
        p_name: cat.name,
        p_is_active: !cat.is_active,
      });

      if (error) throw error;

      showToast(`Category ${cat.is_active ? 'deactivated' : 'activated'}.`, 'success');
      await fetchTaxonomy();
    } catch (err) {
      console.error('Toggle category error:', err);
      showToast(err.message || 'Failed to update category.', 'error');
    }
  };

  // Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const { error } = await supabase.rpc('admin_upsert_category', {
        p_id: null,
        p_name: newCategoryName.trim(),
        p_is_active: true,
      });

      if (error) throw error;

      showToast('Category created.', 'success');
      setNewCategoryName('');
      await fetchTaxonomy();
    } catch (err) {
      console.error('Add category error:', err);
      showToast(err.message || 'Failed to add category.', 'error');
    }
  };

  return (
    <div className="admin-page container">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <header className="admin-header">
        <h1 className="admin-title">Campus Moderation & Administration</h1>
        <p className="admin-subtitle">
          Manage campus trust and safety, resolve reports, moderate listings, and view system audit records.
        </p>
      </header>

      {/* Admin Tabs */}
      <nav className="admin-tabs" aria-label="Admin Navigation Tabs">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          🚩 Reports
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('listings')}
        >
          📚 Listings
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'taxonomy' ? 'active' : ''}`}
          onClick={() => setActiveTab('taxonomy')}
        >
          🏛️ Institutions & Subjects
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📋 Audit Log
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          ✉️ Contact Messages
        </button>
      </nav>

      {/* ── TAB 1: STATS ── */}
      {activeTab === 'stats' && (
        <div>
          {loading && !stats ? (
            <Spinner center label="Loading platform metrics..." />
          ) : (
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-num">{stats?.listings_published ?? 0}</span>
                <span className="admin-stat-label">Published Listings</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-num">{stats?.requests_total ?? 0}</span>
                <span className="admin-stat-label">Total Requests</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-num">{stats?.requests_accepted ?? 0}</span>
                <span className="admin-stat-label">Accepted Requests</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-num">{stats?.books_sold ?? 0}</span>
                <span className="admin-stat-label">Books Sold</span>
              </div>
              <div className="admin-stat-card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
                <span className="admin-stat-num" style={{ color: 'var(--color-danger)' }}>
                  {stats?.open_reports ?? 0}
                </span>
                <span className="admin-stat-label">Open Reports</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-num">{stats?.suspended_users ?? 0}</span>
                <span className="admin-stat-label">Suspended Users</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: REPORTS ── */}
      {activeTab === 'reports' && (
        <div>
          <div className="admin-toolbar">
            <div className="admin-filter-group">
              {['all', 'open', 'reviewing', 'resolved', 'dismissed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`admin-filter-btn ${reportFilter === status ? 'active' : ''}`}
                  onClick={() => setReportFilter(status)}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <Spinner center label="Loading moderation reports..." />
          ) : reports.length === 0 ? (
            <Card>
              <p style={{ textAlign: 'center', color: 'var(--color-muted)', margin: 0 }}>
                No reports found matching status filter "{reportFilter}".
              </p>
            </Card>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Target</th>
                    <th>Reason</th>
                    <th>Details</th>
                    <th>Reporter</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className={`status-pill ${r.status}`}>{r.status}</span>
                      </td>
                      <td>
                        {r.listing ? (
                          <span>Book: <strong>{r.listing.title}</strong></span>
                        ) : r.reported_user ? (
                          <span>User: <strong>{r.reported_user.display_name}</strong></span>
                        ) : (
                          <span style={{ color: 'var(--color-muted)' }}>General</span>
                        )}
                      </td>
                      <td>{r.reason}</td>
                      <td style={{ maxWidth: '240px', wordBreak: 'break-word' }}>
                        {r.details || <span style={{ color: 'var(--color-muted)' }}>None</span>}
                        {r.admin_notes && (
                          <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--color-navy)' }}>
                            <strong>Notes:</strong> {r.admin_notes}
                          </div>
                        )}
                      </td>
                      <td>{r.reporter?.display_name || 'Anonymous'}</td>
                      <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingReport(r);
                            setReportNewStatus(r.status === 'open' ? 'reviewing' : r.status);
                            setReportNotes(r.admin_notes || '');
                          }}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: LISTINGS ── */}
      {activeTab === 'listings' && (
        <div>
          <div className="admin-toolbar">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchListings();
              }}
              style={{ display: 'flex', gap: 'var(--space-2)', flex: 1, maxWidth: '400px' }}
            >
              <Field
                placeholder="Search listings by title..."
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
              />
              <Button type="submit" variant="primary" size="sm">
                Search
              </Button>
            </form>
            <Button variant="outline" size="sm" onClick={fetchListings} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <Spinner center label="Loading listings..." />
          ) : listings.length === 0 ? (
            <Card>
              <p style={{ textAlign: 'center', color: 'var(--color-muted)', margin: 0 }}>
                No listings found.
              </p>
            </Card>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Seller</th>
                    <th>Campus</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.title}</strong>
                        {item.author && <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>by {item.author}</div>}
                      </td>
                      <td>{item.seller?.display_name || 'Unknown'}</td>
                      <td>{item.institution?.name || 'N/A'}</td>
                      <td>{formatPaise(item.price_paise)}</td>
                      <td>
                        <span className={`status-pill ${item.status}`}>{item.status}</span>
                      </td>
                      <td>
                        {item.status !== 'removed' ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setHidingListingId(item.id);
                              setHideReason('');
                            }}
                          >
                            Hide Listing
                          </Button>
                        ) : (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>Hidden</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: USERS ── */}
      {activeTab === 'users' && (
        <div>
          <div className="admin-toolbar">
            <h2 style={{ fontSize: 'var(--font-size-base)', margin: 0, color: 'var(--color-navy)' }}>
              Campus Students Directory
            </h2>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <Spinner center label="Loading user roster..." />
          ) : users.length === 0 ? (
            <Card>
              <p style={{ textAlign: 'center', color: 'var(--color-muted)', margin: 0 }}>
                No registered users found.
              </p>
            </Card>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Campus Institution</th>
                    <th>Course</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.display_name}</strong>
                      </td>
                      <td>{u.institution?.name || 'N/A'}</td>
                      <td>{u.course_or_class || '—'}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserStatusModal({ user: u, nextStatus: 'active' });
                              setUserStatusReason('');
                            }}
                          >
                            Activate
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setUserStatusModal({ user: u, nextStatus: 'suspended' });
                              setUserStatusReason('');
                            }}
                          >
                            Suspend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: TAXONOMY (Institutions & Categories) ── */}
      {activeTab === 'taxonomy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Institutions Section */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', margin: '0 0 var(--space-1)' }}>
                  Campus Institutions
                </h2>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)', margin: 0 }}>
                  Active campus partner universities and colleges.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setEditingInst({ name: '', institution_type: 'university', city: '', area: '', verification_method: 'email_domain', is_active: true })}
              >
                + Add Campus
              </Button>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>City / Area</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={inst.id}>
                      <td><strong>{inst.name}</strong></td>
                      <td>{inst.city} {inst.area ? `(${inst.area})` : ''}</td>
                      <td style={{ textTransform: 'capitalize' }}>{inst.institution_type}</td>
                      <td>
                        <span className={`status-pill ${inst.is_active ? 'accepted' : 'declined'}`}>
                          {inst.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingInst(inst)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Categories Section */}
          <Card>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              Academic Categories / Subjects
            </h2>

            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', maxWidth: '400px' }}>
              <Field
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" size="sm">
                Add
              </Button>
            </form>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td><strong>{cat.name}</strong></td>
                      <td>
                        <span className={`status-pill ${cat.is_active ? 'accepted' : 'declined'}`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleCategory(cat)}
                        >
                          {cat.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 6: AUDIT LOG ── */}
      {activeTab === 'audit' && (
        <div>
          <div className="admin-toolbar">
            <h2 style={{ fontSize: 'var(--font-size-base)', margin: 0, color: 'var(--color-navy)' }}>
              Moderation & Security Audit Log
            </h2>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <Spinner center label="Loading audit logs..." />
          ) : auditLogs.length === 0 ? (
            <Card>
              <p style={{ textAlign: 'center', color: 'var(--color-muted)', margin: 0 }}>
                No audit entries recorded yet.
              </p>
            </Card>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Target Type</th>
                    <th>Target ID</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>
                        <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-navy)' }}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.target_type}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.target_id || '—'}</td>
                      <td>
                        <pre style={{ margin: 0, fontSize: '0.75rem', maxHeight: '60px', overflowY: 'auto' }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 7: CONTACT MESSAGES ── */}
      {activeTab === 'messages' && (
        <div>
          <div className="admin-toolbar">
            <h2 style={{ fontSize: 'var(--font-size-base)', margin: 0, color: 'var(--color-navy)' }}>
              Visitor & Student Contact Inquiries
            </h2>
            <Button variant="outline" size="sm" onClick={fetchMessages} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <Spinner center label="Loading messages..." />
          ) : messages.length === 0 ? (
            <Card>
              <p style={{ textAlign: 'center', color: 'var(--color-muted)', margin: 0 }}>
                No contact messages in the inbox.
              </p>
            </Card>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sender Name</th>
                    <th>Email</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.name}</strong></td>
                      <td>
                        <a href={`mailto:${m.email}`} style={{ color: 'var(--color-navy)' }}>
                          {m.email}
                        </a>
                      </td>
                      <td style={{ maxWidth: '300px', wordBreak: 'break-word' }}>{m.message}</td>
                      <td>
                        <span className={`status-pill ${m.status}`}>{m.status}</span>
                      </td>
                      <td>{new Date(m.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Report Review Modal */}
      {editingReport && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-box">
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              Review Report
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
              Reason: <strong>{editingReport.reason}</strong>
            </p>

            <form onSubmit={handleUpdateReport} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Field
                label="Update Status"
                as="select"
                value={reportNewStatus}
                onChange={(e) => setReportNewStatus(e.target.value)}
                required
              >
                <option value="open">Open</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </Field>

              <Field
                label="Admin Notes"
                as="textarea"
                rows={3}
                placeholder="Internal moderator notes on action taken..."
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
              />

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <Button variant="ghost" type="button" onClick={() => setEditingReport(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hide Listing Confirmation Modal */}
      {hidingListingId && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-box">
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
              Hide Listing
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
              This listing will be marked as removed and hidden from search results.
            </p>

            <form onSubmit={handleHideListing} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Field
                label="Reason for Action"
                placeholder="e.g. Counterfeit book, inappropriate images..."
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                required
              />

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button variant="ghost" type="button" onClick={() => setHidingListingId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" type="submit">
                  Confirm Hide
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Status Modal */}
      {userStatusModal && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-box">
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              Change User Status
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
              Set status for <strong>{userStatusModal.user.display_name}</strong> to <strong>{userStatusModal.nextStatus}</strong>.
            </p>

            <form onSubmit={handleSetUserStatus} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Field
                label="Reason (Optional)"
                placeholder="Reason for suspension or reactivation..."
                value={userStatusReason}
                onChange={(e) => setUserStatusReason(e.target.value)}
              />

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button variant="ghost" type="button" onClick={() => setUserStatusModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant={userStatusModal.nextStatus === 'suspended' ? 'danger' : 'primary'}
                  type="submit"
                >
                  Confirm {userStatusModal.nextStatus}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Institution Modal */}
      {editingInst && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-box">
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              {editingInst.id ? 'Edit Campus Institution' : 'Add Campus Institution'}
            </h2>

            <form onSubmit={handleUpsertInstitution} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Field
                label="Institution Name"
                placeholder="e.g. Indian Institute of Technology Bombay"
                value={editingInst.name}
                onChange={(e) => setEditingInst({ ...editingInst, name: e.target.value })}
                required
              />

              <Field
                label="City"
                placeholder="e.g. Mumbai"
                value={editingInst.city || ''}
                onChange={(e) => setEditingInst({ ...editingInst, city: e.target.value })}
              />

              <Field
                label="Area / Campus Location"
                placeholder="e.g. Powai"
                value={editingInst.area || ''}
                onChange={(e) => setEditingInst({ ...editingInst, area: e.target.value })}
              />

              <Field
                label="Institution Type"
                as="select"
                value={editingInst.institution_type || 'university'}
                onChange={(e) => setEditingInst({ ...editingInst, institution_type: e.target.value })}
              >
                <option value="university">University</option>
                <option value="college">College</option>
                <option value="institute">Institute</option>
                <option value="school">School</option>
              </Field>

              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editingInst.is_active ?? true}
                  onChange={(e) => setEditingInst({ ...editingInst, is_active: e.target.checked })}
                />
                Active (available for student registration)
              </label>

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <Button variant="ghost" type="button" onClick={() => setEditingInst(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Campus
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
