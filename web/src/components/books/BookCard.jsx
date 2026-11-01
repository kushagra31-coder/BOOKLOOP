import React from 'react';
import { Link } from 'react-router-dom';
import { formatPaise } from '../../lib/money';
import { getListingPhotoUrl } from '../../lib/storage';
import './BookCard.css';

const CONDITION_LABELS = {
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export function BookCard({ book }) {
  if (!book) return null;

  const photoUrl = book.cover_path ? getListingPhotoUrl(book.cover_path) : null;
  const conditionLabel = CONDITION_LABELS[book.condition] || book.condition || 'Used';

  return (
    <Link to={`/book/${book.id}`} className="book-card" aria-label={`View details for ${book.title}`}>
      <div className="book-card-image-wrap">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={book.title}
            className="book-card-image"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                e.currentTarget.nextSibling.style.display = 'block';
              }
            }}
          />
        ) : null}
        <span
          className="book-card-placeholder-image"
          style={{ display: photoUrl ? 'none' : 'block' }}
          aria-hidden="true"
        >
          📖
        </span>
      </div>

      <div className="book-card-body">
        <h3 className="book-card-title" title={book.title}>
          {book.title}
        </h3>
        {book.author && (
          <p className="book-card-author" title={book.author}>
            by {book.author}
          </p>
        )}

        <div className="book-card-meta">
          <span className="book-card-condition">{conditionLabel}</span>
          {book.institution_name && (
            <span className="book-card-institution" title={book.institution_name}>
              📍 {book.institution_name}
            </span>
          )}
        </div>

        <div className="book-card-footer">
          <span className="book-card-price">{formatPaise(book.price_paise)}</span>
        </div>
      </div>
    </Link>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="book-card-skeleton" aria-hidden="true">
      <div className="skeleton-image skeleton-pulse" />
      <div className="skeleton-body">
        <div className="skeleton-line title skeleton-pulse" />
        <div className="skeleton-line author skeleton-pulse" />
        <div className="skeleton-line price skeleton-pulse" />
      </div>
    </div>
  );
}
