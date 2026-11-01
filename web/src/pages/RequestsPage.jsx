import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatPaise } from '../lib/money';
import { getListingPhotoUrl } from '../lib/storage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Spinner } from '../components/ui/Spinner';
import { Toast } from '../components/ui/Toast';
import './RequestsPage.css';

export function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('buying'); // 'buying' | 'selling'
  const [buyingRequests, setBuyingRequests] = useState([]);
  const [sellingRequests, setSellingRequests] = useState([]);
  const [sellerWhatsApp, setSellerWhatsApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Per-action loading & WhatsApp resolution states
  const [actionInProgress, setActionInProgress] = useState({});
  const [whatsAppPromptOpen, setWhatsAppPromptOpen] = useState(false);
  const [pendingAcceptId, setPendingAcceptId] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, variant = 'info') => {
    setToast({ message, variant });
  };

  // Fetch requests & seller profile
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch buying requests (current user is buyer)
      const buyingQuery = supabase
        .from('interest_requests')
        .select(`
          id,
          message,
          status,
          created_at,
          responded_at,
          listing:listings (
            id,
            title,
            author,
            price_paise,
            condition,
            status,
            listing_images (storage_path, display_order)
          ),
          seller:profiles!seller_id (
            id,
            display_name
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      // 2. Fetch selling requests (current user is seller)
      const sellingQuery = supabase
        .from('interest_requests')
        .select(`
          id,
          message,
          status,
          created_at,
          responded_at,
          listing:listings (
            id,
            title,
            author,
            price_paise,
            condition,
            status,
            listing_images (storage_path, display_order)
          ),
          buyer:profiles!buyer_id (
            id,
            display_name
          )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      // 3. Fetch current user's whatsapp number to verify readiness to accept
      const waQuery = supabase
        .from('profile_private')
        .select('whatsapp_number')
        .eq('user_id', user.id)
        .maybeSingle();

      const [buyingRes, sellingRes, waRes] = await Promise.all([
        buyingQuery,
        sellingQuery,
        waQuery,
      ]);

      if (buyingRes.error) throw buyingRes.error;
      if (sellingRes.error) throw sellingRes.error;

      setBuyingRequests(buyingRes.data || []);
      setSellingRequests(sellingRes.data || []);
      setSellerWhatsApp(waRes.data?.whatsapp_number || null);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle Cancel Request (for buyers on pending requests)
  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this interest request?')) return;

    setActionInProgress((prev) => ({ ...prev, [requestId]: true }));
    try {
      const { error: rpcError } = await supabase.rpc('cancel_request', {
        p_request_id: requestId,
      });

      if (rpcError) throw rpcError;

      showToast('Interest request cancelled.', 'info');
      await fetchRequests();
    } catch (err) {
      console.error('Failed to cancel request:', err);
      showToast(err.message || 'Unable to cancel request.', 'error');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Handle Respond to Request (for sellers on pending requests: accept / decline)
  const handleRespond = async (requestId, action) => {
    if (action === 'accept') {
      // Check if seller has WhatsApp configured
      if (!sellerWhatsApp || !sellerWhatsApp.trim()) {
        setPendingAcceptId(requestId);
        setWhatsAppPromptOpen(true);
        return;
      }
    }

    if (action === 'decline' && !window.confirm('Decline this buyer request?')) {
      return;
    }

    setActionInProgress((prev) => ({ ...prev, [requestId]: true }));
    try {
      const { error: rpcError } = await supabase.rpc('respond_to_request', {
        p_request_id: requestId,
        p_action: action,
      });

      if (rpcError) throw rpcError;

      showToast(
        action === 'accept'
          ? 'Request accepted! The buyer can now reach out via WhatsApp.'
          : 'Request declined.',
        'success'
      );
      await fetchRequests();
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      if (err.message && err.message.toLowerCase().includes('whatsapp')) {
        setPendingAcceptId(requestId);
        setWhatsAppPromptOpen(true);
      } else {
        showToast(err.message || `Unable to ${action} request.`, 'error');
      }
    } finally {
      setActionInProgress((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Handle WhatsApp Click strictly on-demand (never prefetched)
  const handleWhatsAppClick = async (req) => {
    setActionInProgress((prev) => ({ ...prev, [`wa_${req.id}`]: true }));
    try {
      const { data: whatsappNumber, error: rpcError } = await supabase.rpc(
        'get_seller_contact',
        { p_request_id: req.id }
      );

      if (rpcError) throw rpcError;

      if (!whatsappNumber) {
        throw new Error('Seller has not provided a valid WhatsApp number.');
      }

      // Format digits for wa.me URL: remove non-digits
      const digits = whatsappNumber.replace(/[^0-9]/g, '');
      const greeting = `Hi ${req.seller?.display_name || 'there'}! I'm interested in buying "${req.listing?.title || 'your textbook'}" on BookLoop.`;
      const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`;

      // Open WhatsApp chat in new window
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to get seller contact:', err);
      showToast(
        err.message || 'Unable to retrieve seller contact. Please try again.',
        'error'
      );
    } finally {
      setActionInProgress((prev) => ({ ...prev, [`wa_${req.id}`]: false }));
    }
  };

  // Helper to extract first image path from joined listing
  const getCoverPath = (listing) => {
    if (!listing?.listing_images || listing.listing_images.length === 0) return null;
    const sorted = [...listing.listing_images].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );
    return sorted[0]?.storage_path;
  };

  // Badge counts
  const buyingCount = buyingRequests.length;
  const sellingPendingCount = sellingRequests.filter((r) => r.status === 'pending').length;
  const sellingCount = sellingRequests.length;

  const currentList = tab === 'buying' ? buyingRequests : sellingRequests;

  return (
    <div className="requests-page container">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {/* WhatsApp Prompt Modal for Sellers */}
      {whatsAppPromptOpen && (
        <div className="request-modal-overlay" role="dialog" aria-modal="true">
          <div className="request-modal-content">
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              WhatsApp Number Required
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', marginBottom: 'var(--space-4)', lineHeight: 'var(--line-height-normal)' }}>
              To accept a buyer's interest request, you must have a WhatsApp number set in your profile. BookLoop shares this number only with buyers whose requests you accept so they can coordinate campus pickup.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setWhatsAppPromptOpen(false);
                  setPendingAcceptId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/profile')}
              >
                Go to Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="requests-header">
        <h1 className="requests-title">Interest Requests</h1>
        <p className="requests-subtitle">
          Manage textbook requests, communicate with buyers, and coordinate campus handoffs.
        </p>
      </header>

      {/* Tabs */}
      <div className="requests-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'buying'}
          className={`requests-tab-btn ${tab === 'buying' ? 'active' : ''}`}
          onClick={() => setTab('buying')}
        >
          <span>Buying</span>
          <span className={`requests-badge ${tab === 'buying' ? 'active-badge' : ''}`}>
            {buyingCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'selling'}
          className={`requests-tab-btn ${tab === 'selling' ? 'active' : ''}`}
          onClick={() => setTab('selling')}
        >
          <span>Selling</span>
          <span className={`requests-badge ${tab === 'selling' ? 'active-badge' : ''}`}>
            {sellingPendingCount > 0 ? `${sellingPendingCount} pending` : sellingCount}
          </span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
          <Spinner size="lg" />
          <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
            Loading your requests...
          </p>
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load requests"
          message={error}
          onRetry={fetchRequests}
        />
      ) : currentList.length === 0 ? (
        <Card>
          <EmptyState
            title={tab === 'buying' ? 'No outgoing requests' : 'No incoming requests'}
            message={
              tab === 'buying'
                ? 'You haven’t expressed interest in any textbooks yet. Browse books to find what you need for class!'
                : 'You have not received any buyer requests yet. Make sure your textbooks are listed with good descriptions!'
            }
            actionLabel={tab === 'buying' ? 'Browse Books' : '+ Sell a Book'}
            onAction={() => navigate(tab === 'buying' ? '/search' : '/sell')}
          />
        </Card>
      ) : (
        <div className="requests-list">
          {currentList.map((req) => {
            const coverPath = getCoverPath(req.listing);
            const coverUrl = coverPath ? getListingPhotoUrl(coverPath) : null;
            const isProcessing = !!actionInProgress[req.id];
            const isWhatsAppLoading = !!actionInProgress[`wa_${req.id}`];

            return (
              <article key={req.id} className="request-card">
                <div className="request-card-header">
                  {/* Book summary */}
                  <div className="request-book-info">
                    <div className="request-book-thumb">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={req.listing?.title || 'Book thumbnail'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        '📖'
                      )}
                    </div>
                    <div className="request-book-details">
                      {req.listing ? (
                        <Link
                          to={`/book/${req.listing.id}`}
                          className="request-book-title"
                        >
                          {req.listing.title}
                        </Link>
                      ) : (
                        <span className="request-book-title">[Listing Deleted]</span>
                      )}
                      <div className="request-book-meta">
                        {req.listing?.author && <span>by {req.listing.author}</span>}
                        {req.listing?.price_paise !== undefined && (
                          <span className="request-book-price">
                            {formatPaise(req.listing.price_paise)}
                          </span>
                        )}
                        {req.listing?.condition && (
                          <span style={{ textTransform: 'capitalize' }}>
                            • {req.listing.condition.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span className={`status-pill ${req.status}`}>
                      {req.status === 'pending' && '⏳ Pending'}
                      {req.status === 'accepted' && '✓ Accepted'}
                      {req.status === 'declined' && '✕ Declined'}
                      {req.status === 'cancelled' && '⊘ Cancelled'}
                      {req.status === 'closed' && '🔒 Closed'}
                    </span>
                  </div>
                </div>

                {/* Message display */}
                {req.message && (
                  <div className="request-message-box">
                    <div className="request-message-sender">
                      {tab === 'buying' ? 'Your message:' : `${req.buyer?.display_name || 'Buyer'} says:`}
                    </div>
                    <div>"{req.message}"</div>
                  </div>
                )}

                {/* Footer with Timestamp and Action CTAs */}
                <div className="request-card-footer">
                  <div className="request-date">
                    {tab === 'buying' ? (
                      <>Seller: <strong>{req.seller?.display_name || 'Campus Student'}</strong> • </>
                    ) : (
                      <>Buyer: <strong>{req.buyer?.display_name || 'Campus Student'}</strong> • </>
                    )}
                    {new Date(req.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>

                  <div className="request-actions">
                    {/* Buying Tab Actions */}
                    {tab === 'buying' && (
                      <>
                        {req.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleCancelRequest(req.id)}
                          >
                            {isProcessing ? 'Cancelling...' : 'Cancel Request'}
                          </Button>
                        )}

                        {req.status === 'accepted' && (
                          <button
                            type="button"
                            className="btn-whatsapp button button--primary button--sm"
                            disabled={isWhatsAppLoading}
                            onClick={() => handleWhatsAppClick(req)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            {isWhatsAppLoading ? (
                              <Spinner size="sm" />
                            ) : (
                              <span>💬 Chat on WhatsApp</span>
                            )}
                          </button>
                        )}
                      </>
                    )}

                    {/* Selling Tab Actions */}
                    {tab === 'selling' && (
                      <>
                        {req.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleRespond(req.id, 'decline')}
                            >
                              Decline
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleRespond(req.id, 'accept')}
                            >
                              {isProcessing ? 'Accepting...' : 'Accept Request'}
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
