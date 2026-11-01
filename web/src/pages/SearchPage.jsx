import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { BookCard, BookCardSkeleton } from '../components/books/BookCard';
import './SearchPage.css';

const PAGE_SIZE = 24;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Params as Single Source of Truth
  const paramQuery = searchParams.get('q') || '';
  const paramCategory = searchParams.get('category') || '';
  const paramInstitution = searchParams.get('institution') || '';
  const paramMin = searchParams.get('min') ?? '';
  const paramMax = searchParams.get('max') ?? '';
  const paramSort = searchParams.get('sort') || 'newest';

  // Debounced input state
  const [queryInput, setQueryInput] = useState(paramQuery);

  // Filter options
  const [categories, setCategories] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  // Results state
  const [listings, setListings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Mobile filters toggle
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync query input if URL changes externally
  useEffect(() => {
    setQueryInput(paramQuery);
  }, [paramQuery]);

  // Debounce query input to URL (300ms)
  useEffect(() => {
    if (queryInput === paramQuery) return;

    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (queryInput.trim()) {
          next.set('q', queryInput.trim());
        } else {
          next.delete('q');
        }
        return next;
      }, { replace: true });
    }, 300);

    return () => clearTimeout(timer);
  }, [queryInput, paramQuery, setSearchParams]);

  // Load filter lists (categories & institutions)
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [catRes, instRes] = await Promise.all([
          supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
          supabase.from('institutions').select('id, name').eq('is_active', true).order('name'),
        ]);
        if (catRes.data) setCategories(catRes.data);
        if (instRes.data) setInstitutions(instRes.data);
      } catch (err) {
        console.error('Failed to load filter dropdowns:', err);
      }
    }
    loadFilterOptions();
  }, []);

  // Calculate active filter count for mobile badge
  const activeFilterCount = [
    paramCategory,
    paramInstitution,
    paramMin !== '' ? paramMin : null,
    paramMax !== '' ? paramMax : null,
    paramSort !== 'newest' ? paramSort : null,
  ].filter(Boolean).length;

  // Search function using RPC only
  const executeSearch = useCallback(async (offset = 0, isAppend = false) => {
    if (offset === 0) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      // Empty price field = no limit; 0 is a valid value
      const parsedMin = paramMin !== '' && !isNaN(Number(paramMin))
        ? Math.round(Number(paramMin) * 100)
        : null;

      const parsedMax = paramMax !== '' && !isNaN(Number(paramMax))
        ? Math.round(Number(paramMax) * 100)
        : null;

      const { data, error: rpcError } = await supabase.rpc('search_listings', {
        p_query: paramQuery.trim() || null,
        p_category: paramCategory || null,
        p_institution: paramInstitution || null,
        p_min: parsedMin,
        p_max: parsedMax,
        p_sort: paramSort,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

      if (rpcError) throw rpcError;

      const results = data || [];
      const total = results.length > 0 ? Number(results[0].total_count) : 0;

      setTotalCount(total);
      if (isAppend) {
        setListings((prev) => [...prev, ...results]);
      } else {
        setListings(results);
      }
    } catch (err) {
      console.error('search_listings failed:', err);
      setError(err.message || 'Failed to search textbooks.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [paramQuery, paramCategory, paramInstitution, paramMin, paramMax, paramSort]);

  // Execute search whenever URL parameters change
  useEffect(() => {
    executeSearch(0, false);
  }, [executeSearch]);

  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value !== '' && value !== null && value !== undefined) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    setQueryInput('');
    setSearchParams({});
  };

  const handleLoadMore = () => {
    executeSearch(listings.length, true);
  };

  return (
    <div className="search-page container">
      {/* Mobile Filter Toggle */}
      <div className="search-mobile-filter-bar">
        <button
          type="button"
          className="search-mobile-toggle-btn"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          aria-expanded={mobileFiltersOpen}
        >
          <span>🔍 Filters & Options</span>
          {activeFilterCount > 0 && (
            <span className="search-mobile-badge">{activeFilterCount} active</span>
          )}
        </button>
      </div>

      <div className="search-layout">
        {/* Filters Sidebar */}
        <aside className={`search-sidebar ${!mobileFiltersOpen ? 'collapsed' : ''}`}>
          <div className="search-sidebar-header">
            <h2 className="search-sidebar-title">Filters</h2>
            {(activeFilterCount > 0 || paramQuery) && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={clearAllFilters}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="search-filter-group">
            <Field
              as="select"
              label="Subject / Category"
              value={paramCategory}
              onChange={(e) => updateParam('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Field>
          </div>

          {/* Institution Filter */}
          <div className="search-filter-group">
            <Field
              as="select"
              label="Campus / Institution"
              value={paramInstitution}
              onChange={(e) => updateParam('institution', e.target.value)}
            >
              <option value="">All Campuses</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </Field>
          </div>

          {/* Price Range Filter (in Rupees, 0 is valid, empty is unbounded) */}
          <div className="search-filter-group">
            <label className="search-filter-label">Price Range (₹)</label>
            <div className="search-price-inputs">
              <Field
                type="number"
                min="0"
                placeholder="Min"
                value={paramMin}
                onChange={(e) => updateParam('min', e.target.value)}
                aria-label="Minimum price in rupees"
              />
              <span className="search-price-divider">to</span>
              <Field
                type="number"
                min="0"
                placeholder="Max"
                value={paramMax}
                onChange={(e) => updateParam('max', e.target.value)}
                aria-label="Maximum price in rupees"
              />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="search-results-area">
          {/* Top Search Bar & Sort Dropdown */}
          <div className="search-top-bar">
            <div className="search-main-input-wrap">
              <input
                type="text"
                className="search-main-input"
                placeholder="Search by title, author, course code..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                aria-label="Search textbooks"
              />
            </div>

            <div className="search-sort-wrap">
              <Field
                as="select"
                value={paramSort}
                onChange={(e) => updateParam('sort', e.target.value)}
                aria-label="Sort books by"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </Field>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="search-meta-bar">
            <span className="search-count-text">
              {loading ? (
                'Searching catalog...'
              ) : (
                <>
                  <span className="search-count-bold">{totalCount}</span> {totalCount === 1 ? 'book' : 'books'} found
                  {paramQuery && ` for "${paramQuery}"`}
                </>
              )}
            </span>
          </div>

          {/* Results Display */}
          {loading ? (
            <div className="search-results-grid">
              {Array.from({ length: 8 }).map((_, idx) => (
                <BookCardSkeleton key={idx} />
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title="Search failed"
              message={error}
              onRetry={() => executeSearch(0, false)}
            />
          ) : listings.length === 0 ? (
            <EmptyState
              title="No books match your criteria"
              message="Try broadening your keywords, removing category or campus filters, or resetting price bounds."
              actionLabel="Clear all filters"
              onAction={clearAllFilters}
            />
          ) : (
            <>
              <div className="search-results-grid">
                {listings.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>

              {/* Load More Button */}
              {listings.length < totalCount && (
                <div className="search-load-more-wrap">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading more books...' : `Load more (${totalCount - listings.length} remaining)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
