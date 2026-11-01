import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isConfigured } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { BookCard, BookCardSkeleton } from '../components/books/BookCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import './HomePage.css';

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHomeData = async () => {
    setLoading(true);
    setError(null);

    if (!isConfigured) {
      setError('Supabase project credentials not configured. Please create web/.env.local with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart Vite.');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch active categories
      const catPromise = supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      // 2. Fetch newest listings via RPC search_listings
      const listingsPromise = supabase.rpc('search_listings', {
        p_query: null,
        p_category: null,
        p_institution: null,
        p_min: null,
        p_max: null,
        p_sort: 'newest',
        p_limit: 8,
        p_offset: 0,
      });

      const [catRes, listingsRes] = await Promise.all([catPromise, listingsPromise]);

      if (catRes.error) throw catRes.error;
      if (listingsRes.error) throw listingsRes.error;

      setCategories(catRes.data || []);
      setListings(listingsRes.data || []);
    } catch (err) {
      console.error('Error loading home data:', err);
      setError(err.message || 'Unable to load books. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div className="home-page container">
      {/* Hero Header */}
      <header className="home-hero">
        <Link to="/" className="home-brand-logo" aria-label="BookLoop Home">
          <div className="home-logo-icon">B</div>
          <span className="home-logo-text">BookLoop</span>
        </Link>
        <p className="home-subtitle">
          The verified campus textbook marketplace. Buy and sell course books directly with peers at your college.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="home-search-form" role="search">
          <div className="home-search-input-wrap">
            <input
              type="text"
              className="home-search-input"
              placeholder="Search by title, author, course code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search textbooks"
            />
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>

        <div className="home-hero-actions">
          <Link to="/sell">
            <Button variant="accent">
              + Sell a Book
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="outline">
              Browse All
            </Button>
          </Link>
        </div>
      </header>

      {/* Category Chips */}
      {categories.length > 0 && (
        <section className="home-categories-section" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="home-categories-title">
            Browse by Subject
          </h2>
          <div className="home-category-chips">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/search?category=${encodeURIComponent(cat.id)}`}
                className="home-category-chip"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Newest Listings */}
      <section aria-labelledby="newest-heading">
        <div className="home-section-header">
          <h2 id="newest-heading" className="home-section-title">
            Recently Listed
          </h2>
          <Link to="/search?sort=newest" className="home-view-all-link">
            View all books &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="home-listings-grid">
            {Array.from({ length: 8 }).map((_, idx) => (
              <BookCardSkeleton key={idx} />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to load textbooks"
            message={error}
            onRetry={fetchHomeData}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            title="No books listed yet"
            message="Be the first student to list a textbook on your campus!"
            actionLabel="List a Book"
            onAction={() => navigate('/sell')}
          />
        ) : (
          <div className="home-listings-grid">
            {listings.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
