import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatPaise } from '../lib/money';
import { getListingPhotoUrl } from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';
import { Toast } from '../components/ui/Toast';

export function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  // Modals state
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');
  const [sendingInterest, setSendingInterest] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Incorrect price or fake condition');
  const [reportDetails, setReportDetails] = useState('');
  const [sendingReport, setSendingReport] = useState(false);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blocking, setBlocking] = useState(false);

  // Owner action loading states
  const [actionLoading, setActionLoading] = useState(false);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');

  const fetchListing = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          category:categories(name),
          institution:institutions(name, city),
          seller:profiles!listings_seller_id_fkey(id, display_name),
          listing_images(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('This textbook listing is no longer available or has been removed.');
      }

      setListing(data);

      // If user is logged in and not the seller, check for existing request
      if (user && user.id !== data.seller_id) {
        const { data: reqData } = await supabase
          .from('interest_requests')
          .select('id, status')
          .eq('listing_id', id)
          .eq('buyer_id', user.id)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();

        setExistingRequest(reqData || null);
      }
    } catch (err) {
      console.error('Error fetching book:', err);
      setErrorMsg(err.message || 'Failed to load book details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  if (loading) {
    return <Spinner center label="Loading book listing..." />;
  }

  if (errorMsg || !listing) {
    return (
      <div className="container" style={{ padding: 'var(--space-8) var(--space-4)', maxWidth: '640px' }}>
        <Link to="/search" style={{ color: 'var(--color-navy)', fontSize: 'var(--font-size-sm)', display: 'inline-block', marginBottom: 'var(--space-4)' }}>
          ← Back to Search
        </Link>
        <ErrorState
          title="Listing Not Found"
          message={errorMsg || 'The requested listing could not be found.'}
        />
      </div>
    );
  }

  const isOwner = user?.id === listing.seller_id;
  const canManage = isOwner || isAdmin;
  const isAvailable = listing.status === 'active';

  const images = (listing.listing_images || []).sort((a, b) => a.display_order - b.display_order);
  const activeImageUrl = images.length > 0 ? getListingPhotoUrl(images[selectedImageIdx]?.storage_path) : '';

  // Condition labels
  const conditionLabels = {
    like_new: 'Like New (Pristine, crisp pages)',
    good: 'Good (Minor highlighting/wear)',
    fair: 'Fair (Readable, binding intact)',
    poor: 'Poor (Heavy wear)',
  };

  // 1. Send Interest Request
  const handleSendInterest = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/book/${id}`)}`);
      return;
    }

    if (interestMessage.length > 300) {
      setToastMsg('Message must be 300 characters or less.');
      setToastType('danger');
      return;
    }

    setSendingInterest(true);
    try {
      const { data, error } = await supabase.rpc('create_interest_request', {
        p_listing_id: id,
        p_message: interestMessage.trim() || null,
      });

      if (error) throw error;

      setShowInterestModal(false);
      setInterestMessage('');
      setExistingRequest({ id: data, status: 'pending' });
      setToastMsg('Interest request sent! You can track it in My Requests.');
      setToastType('success');
    } catch (err) {
      console.error('Interest error:', err);
      const msg = err.message || '';
      if (msg.includes('own listing') || msg.includes('Cannot express interest in your own listing')) {
        setToastMsg('You cannot express interest in your own listing.');
      } else if (msg.includes('active request') || msg.includes('duplicate')) {
        setToastMsg('You already have an active request for this textbook.');
      } else if (msg.includes('not available') || msg.includes('Listing is not available')) {
        setToastMsg('This textbook is no longer available.');
      } else if (msg.includes('interact') || msg.includes('blocked')) {
        setToastMsg('Unable to interact with this seller.');
      } else {
        setToastMsg(msg || 'Failed to send interest request.');
      }
      setToastType('danger');
    } finally {
      setSendingInterest(false);
    }
  };

  // 2. Report Listing
  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/book/${id}`)}`);
      return;
    }

    setSendingReport(true);
    try {
      const { error } = await supabase.rpc('create_report', {
        p_listing_id: id,
        p_reported_user_id: listing.seller_id,
        p_reason: reportReason,
        p_details: reportDetails.trim() || null,
      });

      if (error) throw error;

      setShowReportModal(false);
      setReportDetails('');
      setToastMsg('Thank you. Campus moderators will review this report.');
      setToastType('success');
    } catch (err) {
      console.error('Report error:', err);
      setToastMsg(err.message || 'Failed to submit report.');
      setToastType('danger');
    } finally {
      setSendingReport(false);
    }
  };

  // 3. Block Seller
  const handleBlockSeller = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/book/${id}`)}`);
      return;
    }

    setBlocking(true);
    try {
      const { error } = await supabase.rpc('block_user', {
        p_blocked_id: listing.seller_id,
      });

      if (error) throw error;

      setShowBlockModal(false);
      setToastMsg('Seller blocked. Their listings will no longer be visible to you.');
      setToastType('info');
      navigate('/search');
    } catch (err) {
      console.error('Block error:', err);
      setToastMsg(err.message || 'Failed to block seller.');
      setToastType('danger');
    } finally {
      setBlocking(false);
    }
  };

  // 4. Owner: Mark Sold
  const handleMarkSold = async () => {
    if (!window.confirm('Mark this textbook as sold? This will close any remaining pending requests.')) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('mark_listing_sold', { p_id: id });
      if (error) throw error;

      setToastMsg('Book marked as sold!');
      setToastType('success');
      await fetchListing();
    } catch (err) {
      console.error('Mark sold error:', err);
      setToastMsg(err.message || 'Failed to update listing.');
      setToastType('danger');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Owner/Admin: Remove Listing
  const handleRemoveListing = async () => {
    if (!window.confirm('Are you sure you want to remove this listing from the campus marketplace?')) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('remove_listing', { p_id: id });
      if (error) throw error;

      setToastMsg('Listing has been removed.');
      setToastType('info');
      navigate('/search');
    } catch (err) {
      console.error('Remove listing error:', err);
      setToastMsg(err.message || 'Failed to remove listing.');
      setToastType('danger');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)' }}>
      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link to="/search" style={{ color: 'var(--color-navy)', fontSize: 'var(--font-size-sm)' }}>
          ← Back to Search
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Photo Gallery Column */}
        <div>
          <Card style={{ padding: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <div style={{
              width: '100%',
              height: '380px',
              backgroundColor: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {activeImageUrl ? (
                <img
                  src={activeImageUrl}
                  alt={listing.title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ color: 'var(--color-muted)', fontSize: '3rem' }}>📖</span>
              )}
            </div>
          </Card>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  style={{
                    width: '64px',
                    height: '80px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: selectedImageIdx === idx ? '2px solid var(--color-navy)' : '1px solid var(--color-border)',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={getListingPhotoUrl(img.storage_path)}
                    alt={`Thumbnail ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Book Details Column */}
        <div>
          {/* Status Badge */}
          {listing.status !== 'active' && (
            <div style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-bold)',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-2)',
              backgroundColor: listing.status === 'sold' ? '#D1FAE5' : '#FEE2E2',
              color: listing.status === 'sold' ? '#065F46' : '#991B1B',
            }}>
              {listing.status}
            </div>
          )}

          <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)', lineHeight: 'var(--line-height-tight)' }}>
            {listing.title}
          </h1>

          <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-4)' }}>
            {listing.author && <span>By {listing.author}</span>}
            {listing.author && listing.edition && <span> • </span>}
            {listing.edition && <span>{listing.edition}</span>}
          </p>

          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-navy)', marginBottom: 'var(--space-6)' }}>
            {listing.price_paise === 0 ? 'FREE (Giveaway)' : formatPaise(listing.price_paise)}
          </div>

          <Card style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
              Listing Specifications
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)', display: 'block' }}>Condition</span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  {conditionLabels[listing.condition] || listing.condition}
                </span>
              </div>

              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)', display: 'block' }}>Category</span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  {listing.category?.name || 'Textbook'}
                </span>
              </div>

              {listing.course_or_exam && (
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)', display: 'block' }}>Course / Exam</span>
                  <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                    {listing.course_or_exam}
                  </span>
                </div>
              )}
            </div>

            {listing.description && (
              <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
                  Seller Description
                </span>
                <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-relaxed)', whiteSpace: 'pre-wrap' }}>
                  {listing.description}
                </p>
              </div>
            )}
          </Card>

          {/* Seller Card (Strict Privacy: NO phone or email) */}
          <Card style={{ marginBottom: 'var(--space-6)', backgroundColor: 'var(--color-soft-blue)', borderColor: '#BFDBFE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-navy)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'var(--font-weight-bold)'
              }}>
                {(listing.seller?.display_name || 'U')[0].toUpperCase()}
              </div>

              <div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy)' }}>
                  {listing.seller?.display_name || 'Campus Student'}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>
                  🎓 {listing.institution?.name} {listing.institution?.city ? `(${listing.institution.city})` : ''}
                </div>
              </div>
            </div>
          </Card>

          {/* Owner Actions */}
          {canManage ? (
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
              {listing.status !== 'sold' && listing.status !== 'removed' && (
                <Link to={`/sell/${id}/edit`}>
                  <Button variant="outline">Edit Listing</Button>
                </Link>
              )}

              {listing.status === 'active' && (
                <Button variant="secondary" onClick={handleMarkSold} loading={actionLoading}>
                  Mark as Sold
                </Button>
              )}

              <Button variant="danger" onClick={handleRemoveListing} loading={actionLoading}>
                Remove Listing
              </Button>
            </div>
          ) : (
            /* Buyer Actions */
            <div style={{ marginBottom: 'var(--space-6)' }}>
              {existingRequest ? (
                <div style={{
                  backgroundColor: 'var(--color-soft-blue)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  marginBottom: 'var(--space-3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)'
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>
                      Your Interest Request
                    </div>
                    <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-navy)', textTransform: 'capitalize' }}>
                      {existingRequest.status === 'pending' ? '⏳ Pending Seller Response' : '✓ Accepted by Seller'}
                    </div>
                  </div>
                  <Link to="/requests">
                    <Button variant="outline" size="sm">
                      View in My Requests &rarr;
                    </Button>
                  </Link>
                </div>
              ) : isAvailable ? (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    if (!user) {
                      navigate(`/login?next=${encodeURIComponent(`/book/${id}`)}`);
                    } else {
                      setShowInterestModal(true);
                    }
                  }}
                >
                  🤝 I'm Interested
                </Button>
              ) : (
                <Button variant="secondary" size="lg" fullWidth disabled>
                  {listing.status === 'sold' ? 'Book Sold' : 'Listing Unavailable'}
                </Button>
              )}

              {/* Safety Links: Report & Block */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) navigate(`/login?next=${encodeURIComponent(`/book/${id}`)}`);
                    else setShowReportModal(true);
                  }}
                  style={{ color: 'var(--color-danger)', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  🚩 Report Listing
                </button>

                <span style={{ color: 'var(--color-border)' }}>•</span>

                <button
                  type="button"
                  onClick={() => {
                    if (!user) navigate(`/login?next=${encodeURIComponent(`/book/${id}`)}`);
                    else setShowBlockModal(true);
                  }}
                  style={{ color: 'var(--color-muted)', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  🚫 Block Seller
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Express Interest ── */}
      {showInterestModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)', zIndex: 999
        }}>
          <Card style={{ width: '100%', maxWidth: '440px' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              Express Interest
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)', lineHeight: 'var(--line-height-normal)' }}>
              Send an interest request to <strong>{listing.seller?.display_name}</strong>. If accepted, you will receive their WhatsApp contact to coordinate meetup on campus.
            </p>

            <form onSubmit={handleSendInterest}>
              <div style={{ marginBottom: 'var(--space-1)' }}>
                <Field
                  label="Note to Seller (Optional, max 300 characters)"
                  as="textarea"
                  placeholder="e.g. Can meet near campus library tomorrow afternoon..."
                  maxLength={300}
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                />
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: interestMessage.length > 280 ? 'var(--color-danger)' : 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
                {interestMessage.length} / 300
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowInterestModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={sendingInterest}>
                  Send Request
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Modal: Report Listing ── */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)', zIndex: 999
        }}>
          <Card style={{ width: '100%', maxWidth: '440px' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
              Report Listing or Seller
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
              Reports are confidential and reviewed by campus moderators.
            </p>

            <form onSubmit={handleSendReport}>
              <Field
                label="Reason"
                as="select"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                required
              >
                <option value="Incorrect price or fake condition">Incorrect price or fake condition</option>
                <option value="Suspicious or fraudulent listing">Suspicious or fraudulent listing</option>
                <option value="Inappropriate or prohibited content">Inappropriate or prohibited content</option>
                <option value="Harassment or spam">Harassment or spam</option>
              </Field>

              <Field
                label="Additional Details (Optional)"
                as="textarea"
                placeholder="Provide any additional context for campus administrators..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowReportModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" size="sm" loading={sendingReport}>
                  Submit Report
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Modal: Block Seller ── */}
      {showBlockModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)', zIndex: 999
        }}>
          <Card style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              Block this Seller?
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)', lineHeight: 'var(--line-height-normal)' }}>
              You will no longer see listings from <strong>{listing.seller?.display_name}</strong> and they will not be able to interact with you.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowBlockModal(false)} disabled={blocking}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleBlockSeller} loading={blocking}>
                Block Seller
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
