import {
  DEMO_INSTITUTIONS,
  DEMO_CATEGORIES,
  DEMO_USERS,
  INITIAL_DEMO_BOOKS,
  generateCoverSvg,
} from './demoData';

const STORAGE_KEY_PREFIX = 'bookloop_demo_';

function getStored(key, defaultVal) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.warn('[DemoStore] LocalStorage write error:', e);
  }
}

// Initialize seed data with covers if not already in localStorage
function initDemoState() {
  let users = getStored('users', null);
  if (!users) {
    users = DEMO_USERS;
    setStored('users', users);
  }

  let listings = getStored('listings', null);
  if (!listings) {
    listings = INITIAL_DEMO_BOOKS.map((b) => {
      const coverUrl = generateCoverSvg({
        title: b.title,
        author: b.author,
        category: DEMO_CATEGORIES.find((c) => c.id === b.category_id)?.name || 'Engineering',
        colorHex: b.cover_color,
        accentHex: b.accent_color,
      });

      return {
        ...b,
        images: [coverUrl],
        listing_images: [
          { id: `img-${b.id}-1`, listing_id: b.id, storage_path: coverUrl, display_order: 1 },
        ],
      };
    });
    setStored('listings', listings);
  }

  let requests = getStored('requests', null);
  if (!requests) {
    requests = [
      // Kushagra has an accepted request on Bhagyesh's Operating System Concepts
      {
        id: 'req-demo-1',
        listing_id: 'book-1',
        buyer_id: 'user-kushagra',
        seller_id: 'user-bhagyesh',
        message: 'Hi Bhagyesh, I have CS301 OS lab tomorrow. Can we meet near AITR Central Library during lunch?',
        status: 'accepted',
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        responded_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
      // Kushagra has a pending request on Bhagyesh's Introduction to Algorithms
      {
        id: 'req-demo-2',
        listing_id: 'book-2',
        buyer_id: 'user-kushagra',
        seller_id: 'user-bhagyesh',
        message: 'Hey, is this still available? I want to buy the CLRS algorithms book.',
        status: 'pending',
        created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
        responded_at: null,
      },
      // Priya has a pending request on Kushagra's Math book
      {
        id: 'req-demo-3',
        listing_id: 'book-3',
        buyer_id: 'user-priya',
        seller_id: 'user-kushagra',
        message: 'Interested in Grewal Engineering Math!',
        status: 'pending',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        responded_at: null,
      },
    ];
    setStored('requests', requests);
  }

  // Active session
  let activeUserId = getStored('active_user_id', 'user-kushagra');
  if (!users.find((u) => u.id === activeUserId)) {
    activeUserId = 'user-kushagra';
    setStored('active_user_id', activeUserId);
  }
}

initDemoState();

export class DemoStore {
  static getUsers() {
    return getStored('users', DEMO_USERS);
  }

  static getActiveUser() {
    const users = this.getUsers();
    const activeId = getStored('active_user_id', 'user-kushagra');
    return users.find((u) => u.id === activeId) || users[0];
  }

  static setActiveUser(userId) {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (target) {
      setStored('active_user_id', userId);
      window.dispatchEvent(new CustomEvent('bookloop_auth_change', { detail: target }));
    }
    return target;
  }

  static clearActiveUser() {
    setStored('active_user_id', null);
    window.dispatchEvent(new CustomEvent('bookloop_auth_change', { detail: null }));
  }

  static getInstitutions() {
    return DEMO_INSTITUTIONS;
  }

  static getCategories() {
    return DEMO_CATEGORIES;
  }

  static getListings() {
    return getStored('listings', []);
  }

  static getRequests() {
    return getStored('requests', []);
  }

  static searchListings({ query, category, institution, minPrice, maxPrice, sort = 'newest', limit = 24, offset = 0 }) {
    let list = this.getListings().filter((b) => b.status === 'active');
    const institutions = this.getInstitutions();
    const categories = this.getCategories();
    const users = this.getUsers();

    if (query) {
      const q = query.toLowerCase();
      list = list.filter((b) =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.course_or_exam || '').toLowerCase().includes(q)
      );
    }

    if (category) {
      list = list.filter((b) => b.category_id === category);
    }

    if (institution) {
      list = list.filter((b) => b.institution_id === institution);
    }

    if (minPrice !== null && minPrice !== undefined) {
      list = list.filter((b) => b.price_paise >= minPrice);
    }

    if (maxPrice !== null && maxPrice !== undefined) {
      list = list.filter((b) => b.price_paise <= maxPrice);
    }

    if (sort === 'price_asc') {
      list.sort((a, b) => a.price_paise - b.price_paise);
    } else if (sort === 'price_desc') {
      list.sort((a, b) => b.price_paise - a.price_paise);
    } else {
      // newest
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const totalCount = list.length;
    const paginated = list.slice(offset, offset + limit).map((b) => {
      const inst = institutions.find((i) => i.id === b.institution_id);
      const cat = categories.find((c) => c.id === b.category_id);
      const seller = users.find((u) => u.id === b.seller_id);
      return {
        id: b.id,
        title: b.title,
        author: b.author,
        category_name: cat?.name || 'Textbook',
        condition: b.condition,
        price_paise: b.price_paise,
        created_at: b.created_at,
        institution_name: inst?.name || 'AITR, Indore',
        seller_display_name: seller?.display_name || 'Campus Student',
        cover_path: b.images?.[0] || b.listing_images?.[0]?.storage_path || '',
        total_count: totalCount,
      };
    });

    return { data: paginated, count: totalCount };
  }

  static getBookDetail(id) {
    const listings = this.getListings();
    const book = listings.find((b) => b.id === id);
    if (!book) return null;

    const inst = this.getInstitutions().find((i) => i.id === book.institution_id);
    const cat = this.getCategories().find((c) => c.id === book.category_id);
    const seller = this.getUsers().find((u) => u.id === book.seller_id);

    return {
      ...book,
      institution: inst || { name: 'Acropolis Institute of Technology and Research', city: 'Indore' },
      category: cat || { name: 'Engineering' },
      seller: { id: seller?.id, display_name: seller?.display_name || 'Campus Student' },
      listing_images: book.listing_images || [{ id: 'img-1', storage_path: book.images?.[0], display_order: 1 }],
    };
  }

  static createListing(payload) {
    const activeUser = this.getActiveUser();
    if (!activeUser) throw new Error('You must be signed in to create a listing.');

    const listings = this.getListings();
    const categories = this.getCategories();
    const cat = categories.find((c) => c.id === payload.p_category_id);

    const coverUrl = (payload.p_image_paths && payload.p_image_paths[0]) || generateCoverSvg({
      title: payload.p_title,
      author: payload.p_author,
      category: cat?.name || 'Textbook',
      colorHex: '#1E3A8A',
      accentHex: '#F4C95D',
    });

    const newBookId = `book-${Date.now()}`;
    const newBook = {
      id: newBookId,
      title: payload.p_title,
      author: payload.p_author || 'Unknown',
      edition: payload.p_edition || '',
      category_id: payload.p_category_id,
      course_or_exam: payload.p_course_or_exam || '',
      condition: payload.p_condition,
      price_paise: payload.p_price_paise,
      description: payload.p_description || '',
      status: 'active',
      seller_id: activeUser.id,
      institution_id: activeUser.institution_id || 'inst-1',
      created_at: new Date().toISOString(),
      images: payload.p_image_paths && payload.p_image_paths.length > 0 ? payload.p_image_paths : [coverUrl],
      listing_images: (payload.p_image_paths || [coverUrl]).map((path, idx) => ({
        id: `img-${newBookId}-${idx + 1}`,
        listing_id: newBookId,
        storage_path: path,
        display_order: idx + 1,
      })),
    };

    listings.unshift(newBook);
    setStored('listings', listings);
    return newBookId;
  }

  static createInterestRequest({ p_listing_id, p_message }) {
    const activeUser = this.getActiveUser();
    if (!activeUser) throw new Error('Please sign in to send an interest request.');

    const listings = this.getListings();
    const book = listings.find((b) => b.id === p_listing_id);
    if (!book) throw new Error('Listing not found.');
    if (book.seller_id === activeUser.id) throw new Error('You cannot request your own book.');
    if (book.status !== 'active') throw new Error('This book is no longer available.');

    const requests = this.getRequests();
    const existing = requests.find(
      (r) => r.listing_id === p_listing_id && r.buyer_id === activeUser.id && ['pending', 'accepted'].includes(r.status)
    );
    if (existing) throw new Error('You already have an active request for this book.');

    const newReqId = `req-${Date.now()}`;
    const newReq = {
      id: newReqId,
      listing_id: p_listing_id,
      buyer_id: activeUser.id,
      seller_id: book.seller_id,
      message: p_message || "Hi, I'm interested in purchasing your book!",
      status: 'pending',
      created_at: new Date().toISOString(),
      responded_at: null,
    };

    requests.unshift(newReq);
    setStored('requests', requests);
    return newReqId;
  }

  static respondToRequest({ p_request_id, p_action }) {
    const activeUser = this.getActiveUser();
    const requests = this.getRequests();
    const req = requests.find((r) => r.id === p_request_id);

    if (!req) throw new Error('Request not found.');
    if (req.seller_id !== activeUser.id) throw new Error('Only the seller can accept or decline.');
    if (req.status !== 'pending') throw new Error('This request has already been handled.');

    if (p_action === 'accept') {
      if (!activeUser.whatsapp_number) {
        throw new Error('You must set a valid WhatsApp number in your profile before accepting requests.');
      }
      req.status = 'accepted';
      req.responded_at = new Date().toISOString();
    } else {
      req.status = 'declined';
      req.responded_at = new Date().toISOString();
    }

    setStored('requests', requests);
    return true;
  }

  static getSellerContact(p_request_id) {
    const activeUser = this.getActiveUser();
    const requests = this.getRequests();
    const req = requests.find((r) => r.id === p_request_id);

    if (!req) throw new Error('Request not found.');
    if (req.buyer_id !== activeUser.id) throw new Error('Unauthorized.');
    if (req.status !== 'accepted') throw new Error('Request is not accepted yet.');

    const users = this.getUsers();
    const seller = users.find((u) => u.id === req.seller_id);
    return seller?.whatsapp_number || '+919876543210';
  }

  static markListingSold(p_id) {
    const activeUser = this.getActiveUser();
    const listings = this.getListings();
    const book = listings.find((b) => b.id === p_id);

    if (!book) throw new Error('Listing not found.');
    if (book.seller_id !== activeUser.id && activeUser.role !== 'admin') {
      throw new Error('Only the seller or admin can mark a book as sold.');
    }

    book.status = 'sold';
    book.sold_at = new Date().toISOString();

    // Close remaining pending requests atomically
    const requests = this.getRequests();
    requests.forEach((r) => {
      if (r.listing_id === p_id && r.status === 'pending') {
        r.status = 'closed';
      }
    });

    setStored('listings', listings);
    setStored('requests', requests);
    return true;
  }

  static removeListing(p_id) {
    const activeUser = this.getActiveUser();
    const listings = this.getListings();
    const book = listings.find((b) => b.id === p_id);

    if (!book) throw new Error('Listing not found.');
    if (book.seller_id !== activeUser.id && activeUser.role !== 'admin') {
      throw new Error('Only the seller or admin can remove a listing.');
    }

    book.status = 'removed';
    setStored('listings', listings);
    return true;
  }
}
