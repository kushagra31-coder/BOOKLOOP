import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { rupeesToPaise, paiseToRupees } from '../lib/money';
import {
  validateImageFile,
  uploadListingPhoto,
  deleteListingPhotos,
  getListingPhotoUrl,
} from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { Spinner } from '../components/ui/Spinner';
import { Toast } from '../components/ui/Toast';

export function SellPage({ isEdit = false }) {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(isEdit);

  // Form Fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [edition, setEdition] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [courseOrExam, setCourseOrExam] = useState('');
  const [condition, setCondition] = useState('good');
  const [priceRupees, setPriceRupees] = useState('');
  const [description, setDescription] = useState('');

  // Photos state: Array of objects:
  // { id: string, file: File | null, path: string | null, previewUrl: string, isExisting: boolean, progress: number }
  const [photos, setPhotos] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, []);

  // If in edit mode, load existing listing data and images
  useEffect(() => {
    if (!isEdit || !editId) return;

    async function loadListingForEdit() {
      try {
        setLoadingInitial(true);
        const { data: listing, error: listErr } = await supabase
          .from('listings')
          .select('*, listing_images(*)')
          .eq('id', editId)
          .single();

        if (listErr || !listing) {
          throw new Error('Listing not found or could not be loaded.');
        }

        // Only owner or admin can edit
        if (listing.seller_id !== user?.id) {
          // Check if admin
          const { data: adminRole } = await supabase
            .from('admin_roles')
            .select('role')
            .eq('user_id', user?.id)
            .maybeSingle();

          if (!adminRole) {
            throw new Error('You do not have permission to edit this listing.');
          }
        }

        if (listing.status === 'sold' || listing.status === 'removed') {
          throw new Error('Cannot edit a listing that is already sold or removed.');
        }

        setTitle(listing.title || '');
        setAuthor(listing.author || '');
        setEdition(listing.edition || '');
        setCategoryId(listing.category_id || '');
        setCourseOrExam(listing.course_or_exam || '');
        setCondition(listing.condition || 'good');
        setPriceRupees(String(paiseToRupees(listing.price_paise)));
        setDescription(listing.description || '');

        // Load existing images
        const existingImages = (listing.listing_images || [])
          .sort((a, b) => a.display_order - b.display_order)
          .map((img) => ({
            id: img.id,
            file: null,
            path: img.storage_path,
            previewUrl: getListingPhotoUrl(img.storage_path),
            isExisting: true,
            progress: 100,
          }));

        setPhotos(existingImages);
      } catch (err) {
        console.error('Error loading listing:', err);
        setErrorMsg(err.message);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadListingForEdit();
  }, [isEdit, editId, user?.id]);

  // Handle file selection
  const handlePhotoSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const remainingSlots = 3 - photos.length;
    if (remainingSlots <= 0) {
      setErrorMsg('You can upload a maximum of 3 photos.');
      return;
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots);
    const newPhotoItems = [];

    for (const file of filesToAdd) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrorMsg(validation.error);
        return;
      }

      newPhotoItems.push({
        id: crypto.randomUUID(),
        file,
        path: null,
        previewUrl: URL.createObjectURL(file),
        isExisting: false,
        progress: 0,
      });
    }

    setErrorMsg('');
    setPhotos((prev) => [...prev, ...newPhotoItems]);
    // Reset input
    e.target.value = '';
  };

  // Remove photo before saving
  const handleRemovePhoto = (photoId) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === photoId);
      if (removed && !removed.isExisting && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((p) => p.id !== photoId);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!title.trim()) {
      setErrorMsg('Title is required.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Please select a category.');
      return;
    }
    const rupeesNum = parseFloat(priceRupees);
    if (isNaN(rupeesNum) || rupeesNum < 0) {
      setErrorMsg('Please enter a valid price (₹0 or greater).');
      return;
    }
    if (description.length > 500) {
      setErrorMsg('Description must be 500 characters or fewer.');
      return;
    }
    if (photos.length < 1 || photos.length > 3) {
      setErrorMsg('Please provide between 1 and 3 photos for your book.');
      return;
    }

    setSubmitting(true);
    setStatusText('Preparing photos for upload...');

    const newlyUploadedPaths = [];

    try {
      // 1. Upload new files first
      const finalPaths = [];

      for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        if (item.isExisting && item.path) {
          finalPaths.push(item.path);
        } else if (item.file) {
          setStatusText(`Uploading photo ${i + 1} of ${photos.length}...`);

          // Update item progress
          const path = await uploadListingPhoto(item.file, user.id, (prog) => {
            setPhotos((current) =>
              current.map((p) => (p.id === item.id ? { ...p, progress: prog } : p))
            );
          });

          newlyUploadedPaths.push(path);
          finalPaths.push(path);
        }
      }

      setStatusText('Saving listing details...');
      const pricePaise = rupeesToPaise(rupeesNum);

      if (isEdit) {
        // Call update_listing RPC
        const { error: rpcErr } = await supabase.rpc('update_listing', {
          p_listing_id: editId,
          p_title: title.trim(),
          p_author: author.trim() || null,
          p_edition: edition.trim() || null,
          p_category_id: categoryId,
          p_course_or_exam: courseOrExam.trim() || null,
          p_condition: condition,
          p_description: description.trim() || null,
          p_price_paise: pricePaise,
          p_image_paths: finalPaths,
        });

        if (rpcErr) throw rpcErr;
        navigate(`/book/${editId}`);
      } else {
        // Call create_listing RPC
        const { data: newListingId, error: rpcErr } = await supabase.rpc('create_listing', {
          p_title: title.trim(),
          p_author: author.trim() || null,
          p_edition: edition.trim() || null,
          p_category_id: categoryId,
          p_course_or_exam: courseOrExam.trim() || null,
          p_condition: condition,
          p_description: description.trim() || null,
          p_price_paise: pricePaise,
          p_image_paths: finalPaths,
        });

        if (rpcErr) throw rpcErr;
        navigate(`/book/${newListingId}`);
      }
    } catch (err) {
      console.error('Submission failed:', err);
      // Clean up newly uploaded photos if RPC fails
      if (newlyUploadedPaths.length > 0) {
        setStatusText('Cleaning up uploaded images...');
        await deleteListingPhotos(newlyUploadedPaths);
      }

      setErrorMsg(err.message || 'Failed to save listing. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
      setStatusText('');
    }
  };

  if (loadingInitial) {
    return <Spinner center label="Loading listing..." />;
  }

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '640px' }}>
      <Toast message={toastMsg} onClose={() => setToastMsg('')} />

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link
          to={isEdit ? `/book/${editId}` : '/'}
          style={{ color: 'var(--color-navy)', fontSize: 'var(--font-size-sm)' }}
        >
          ← {isEdit ? 'Back to listing' : 'Back to Home'}
        </Link>
      </div>

      <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
        {isEdit ? 'Edit Book Listing' : 'Sell a Textbook'}
      </h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-6)' }}>
        List your course book for sale directly to verified peers on your campus.
      </p>

      <Card>
        {errorMsg && (
          <ErrorState
            title="Listing Error"
            message={errorMsg}
            className="mb-4"
          />
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <Field
            label="Book Title"
            placeholder="e.g. Operating System Concepts"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <Field
              label="Author(s)"
              placeholder="e.g. Silberschatz, Galvin"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />

            <Field
              label="Edition / Year"
              placeholder="e.g. 10th Edition"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
            />
          </div>

          <Field
            label="Category"
            as="select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">-- Select academic category --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <Field
              label="Course / Exam / Subject"
              placeholder="e.g. CS201 / GATE CSE"
              value={courseOrExam}
              onChange={(e) => setCourseOrExam(e.target.value)}
            />

            <Field
              label="Condition"
              as="select"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
            >
              <option value="like_new">Like New (Unmarked, crisp pages)</option>
              <option value="good">Good (Light wear, minor highlighting)</option>
              <option value="fair">Fair (Readable, binding intact)</option>
              <option value="poor">Poor (Heavy wear, loose cover)</option>
            </Field>
          </div>

          <Field
            label="Price (in Indian Rupees ₹)"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 450 (enter 0 if giving away for free)"
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value)}
            required
            hint="Set an affordable campus price. Enter 0 if offering as a giveaway."
          />

          {/* Description with character counter */}
          <div style={{ position: 'relative' }}>
            <Field
              label="Description & Notes"
              as="textarea"
              maxLength={500}
              placeholder="Mention semester usefulness, highlighting notes, missing pages, or campus pickup preferences..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              hint="Max 500 characters."
            />
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                fontSize: 'var(--font-size-xs)',
                color: description.length >= 480 ? 'var(--color-danger)' : 'var(--color-muted)',
              }}
            >
              {description.length}/500
            </span>
          </div>

          {/* Photos Upload Section (1..3 photos) */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              Book Photos * <span style={{ fontWeight: 'normal', color: 'var(--color-muted)' }}>(1 to 3 images, max 2MB each)</span>
            </label>

            {/* Photo Previews Grid */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
              {photos.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    position: 'relative',
                    width: '100px',
                    height: '130px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <img
                    src={item.previewUrl}
                    alt={`Preview ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Progress bar overlay if uploading */}
                  {submitting && item.progress < 100 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: '#E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          width: `${item.progress}%`,
                          height: '100%',
                          background: 'var(--color-navy)',
                          transition: 'width 0.2s',
                        }}
                      />
                    </div>
                  )}

                  {!submitting && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(item.id)}
                      aria-label={`Remove photo ${idx + 1}`}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}

                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '4px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#FFF',
                      fontSize: '10px',
                      padding: '1px 4px',
                      borderRadius: '3px',
                    }}
                  >
                    #{idx + 1}
                  </span>
                </div>
              ))}

              {/* Add Photo Button Slot (if < 3) */}
              {photos.length < 3 && !submitting && (
                <label
                  style={{
                    width: '100px',
                    height: '130px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px dashed var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--color-muted)',
                    textAlign: 'center',
                    padding: 'var(--space-2)',
                    fontSize: 'var(--font-size-xs)',
                    backgroundColor: 'var(--color-bg)',
                  }}
                >
                  <span style={{ fontSize: '1.5rem', marginBottom: '2px' }}>📷</span>
                  <span>+ Add Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submission status text */}
          {statusText && (
            <p style={{ color: 'var(--color-navy)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
              {statusText}
            </p>
          )}

          <Button type="submit" variant="primary" loading={submitting} fullWidth>
            {isEdit ? 'Save Changes' : 'Publish Listing'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
