import {
  DEMO_INSTITUTIONS,
  DEMO_CATEGORIES,
  DEMO_USERS,
  INITIAL_DEMO_BOOKS,
  generateCoverSvg,
} from './demoData.js';

const STORAGE_KEY_PREFIX = 'bookloop_demo_';

const INITIAL_REPORTS = [
  {
    id: 'rep-1',
    reporter_id: 'user-priya',
    reported_user_id: 'user-bhagyesh',
    listing_id: 'book-1',
    reason: 'condition_mismatch',
    details: 'Book cover had slight wear not mentioned in description.',
    status: 'open',
    admin_notes: null,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    resolved_at: null,
  },
  {
    id: 'rep-2',
    reporter_id: 'user-rohan',
    reported_user_id: 'user-kushagra',
    listing_id: 'book-3',
    reason: 'spam',
    details: 'Verified test inquiry.',
    status: 'resolved',
    admin_notes: 'Reviewed by admin. Listing is authentic.',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    resolved_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

const INITIAL_AUDIT = [
  {
    id: 'aud-1',
    admin_id: 'user-admin',
    action: 'institution_verified',
    target_type: 'institution',
    target_id: 'inst-1',
    details: { message: 'Verified Acropolis Institute of Technology and Research campus domain' },
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'aud-2',
    admin_id: 'user-admin',
    action: 'report_resolved',
    target_type: 'report',
    target_id: 'rep-2',
    details: { message: 'Reviewed and closed test report on Higher Engineering Mathematics' },
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'aud-3',
    admin_id: 'user-admin',
    action: 'account_approved',
    target_type: 'user',
    target_id: 'user-kushagra',
    details: { message: 'Verified campus credentials for Kushagra Singh Tomar' },
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
];

const INITIAL_CONTACT_MESSAGES = [
  {
    id: 'cmsg-1',
    name: 'Aditya Mehta',
    email: 'aditya.mehta@aitr.ac.in',
    subject: 'Question about book handover points on campus',
    message: 'Hi Admin, where is the designated safety meet point inside AITR campus?',
    status: 'unread',
    created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 'cmsg-2',
    name: 'Sneha Patel',
    email: 'sneha@dpsindore.edu',
    subject: 'School textbook request for Class 12 CBSE',
    message: 'Can we add NCERT Physics and Chemistry to the standard categories?',
    status: 'read',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
];

function getStored(key, defaultVal) {
  try {
    if (typeof localStorage === 'undefined') return defaultVal;
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.warn('[DemoStore] LocalStorage write error:', e);
  }
}

// Initialize seed data with covers if not already in localStorage
export function initDemoState() {
  let users = getStored('users', null);
  if (!users) {
    users = DEMO_USERS;
    setStored('users', users);
  }

  let institutions = getStored('institutions', null);
  if (!institutions) {
    institutions = DEMO_INSTITUTIONS;
    setStored('institutions', institutions);
  }

  let categories = getStored('categories', null);
  if (!categories) {
    categories = DEMO_CATEGORIES;
    setStored('categories', categories);
  }

  let reports = getStored('reports', null);
  if (!reports) {
    reports = INITIAL_REPORTS;
    setStored('reports', reports);
  }

  let audit = getStored('admin_audit', null);
  if (!audit) {
    audit = INITIAL_AUDIT;
    setStored('admin_audit', audit);
  }

  let contactMessages = getStored('contact_messages', null);
  if (!contactMessages) {
    contactMessages = INITIAL_CONTACT_MESSAGES;
    setStored('contact_messages', contactMessages);
  }

  let listings = getStored('listings', null);
  if (!listings) {
    listings = INITIAL_DEMO_BOOKS.map((b) => {
      const coverUrl = generateCoverSvg({
        title: b.title,
        author: b.author,
        category: categories.find((c) => c.id === b.category_id)?.name || 'Engineering',
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

  // Active session - default to null (logged out) so user starts signed out
  let activeUserId = getStored('active_user_id', null);
  if (activeUserId && !users.find((u) => u.id === activeUserId)) {
    activeUserId = null;
    setStored('active_user_id', null);
  }
}

initDemoState();

export class DemoStore {
  static getUsers() {
    return getStored('users', DEMO_USERS);
  }

  static getActiveUser() {
    const users = this.getUsers();
    const activeId = getStored('active_user_id', null);
    if (!activeId) return null;
    return users.find((u) => u.id === activeId) || null;
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
    return getStored('institutions', DEMO_INSTITUTIONS);
  }

  static upsertInstitution(instData) {
    const list = [...this.getInstitutions()];
    const id = instData.p_id || instData.id;
    if (id) {
      const idx = list.findIndex((x) => x.id === id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          name: instData.p_name !== undefined ? instData.p_name.trim() : (instData.name?.trim() || list[idx].name),
          institution_type: instData.p_institution_type !== undefined ? instData.p_institution_type : (instData.institution_type || list[idx].institution_type),
          city: instData.p_city !== undefined ? instData.p_city : (instData.city !== undefined ? instData.city : list[idx].city),
          area: instData.p_area !== undefined ? instData.p_area : (instData.area !== undefined ? instData.area : list[idx].area),
          verification_method: instData.p_verification_method !== undefined ? instData.p_verification_method : (instData.verification_method || list[idx].verification_method),
          is_active: instData.p_is_active !== undefined ? instData.p_is_active : (instData.is_active ?? list[idx].is_active),
          updated_at: new Date().toISOString(),
        };
        setStored('institutions', list);
        return list[idx].id;
      }
    }
    const newId = `inst-${Date.now()}`;
    const newInst = {
      id: newId,
      name: (instData.p_name || instData.name || 'New Campus').trim(),
      institution_type: instData.p_institution_type || instData.institution_type || 'college',
      city: instData.p_city || instData.city || 'Indore',
      area: instData.p_area || instData.area || '',
      verification_method: instData.p_verification_method || instData.verification_method || 'email_domain',
      is_active: instData.p_is_active !== undefined ? instData.p_is_active : (instData.is_active ?? true),
      created_at: new Date().toISOString(),
    };
    list.push(newInst);
    setStored('institutions', list);
    return newId;
  }

  static deleteInstitution(id) {
    let list = this.getInstitutions();
    list = list.filter((x) => x.id !== id);
    setStored('institutions', list);
    return true;
  }

  static toggleInstitution(id) {
    const list = [...this.getInstitutions()];
    const item = list.find((x) => x.id === id);
    if (item) {
      item.is_active = !item.is_active;
      setStored('institutions', list);
      return item.is_active;
    }
    return false;
  }

  static getCategories() {
    return getStored('categories', DEMO_CATEGORIES);
  }

  static upsertCategory(catData) {
    const list = [...this.getCategories()];
    const id = catData.p_id || catData.id;
    if (id) {
      const idx = list.findIndex((x) => x.id === id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          name: catData.p_name !== undefined ? catData.p_name.trim() : (catData.name?.trim() || list[idx].name),
          is_active: catData.p_is_active !== undefined ? catData.p_is_active : (catData.is_active ?? list[idx].is_active),
          updated_at: new Date().toISOString(),
        };
        setStored('categories', list);
        return list[idx].id;
      }
    }
    const newId = `cat-${Date.now()}`;
    const newCat = {
      id: newId,
      name: (catData.p_name || catData.name || 'New Category').trim(),
      is_active: catData.p_is_active !== undefined ? catData.p_is_active : (catData.is_active ?? true),
      created_at: new Date().toISOString(),
    };
    list.push(newCat);
    setStored('categories', list);
    return newId;
  }

  static deleteCategory(id) {
    let list = this.getCategories();
    list = list.filter((x) => x.id !== id);
    setStored('categories', list);
    return true;
  }

  static toggleCategory(id) {
    const list = [...this.getCategories()];
    const item = list.find((x) => x.id === id);
    if (item) {
      item.is_active = !item.is_active;
      setStored('categories', list);
      return item.is_active;
    }
    return false;
  }

  static getReports() {
    const reports = getStored('reports', INITIAL_REPORTS);
    const users = this.getUsers();
    const listings = this.getListings();
    return reports.map((r) => ({
      ...r,
      reporter: users.find((u) => u.id === r.reporter_id) || { display_name: 'Campus Student' },
      reported_user: users.find((u) => u.id === r.reported_user_id) || { display_name: 'Campus User' },
      listing: listings.find((l) => l.id === r.listing_id) || (r.listing_id ? { id: r.listing_id, title: 'Listing #' + r.listing_id } : null),
    }));
  }

  static updateReport({ p_report_id, p_status, p_admin_notes }) {
    const raw = [...getStored('reports', INITIAL_REPORTS)];
    const target = raw.find((r) => r.id === p_report_id);
    if (target) {
      target.status = p_status;
      if (p_admin_notes !== undefined) target.admin_notes = p_admin_notes;
      if (p_status === 'resolved' || p_status === 'dismissed') {
        target.resolved_at = new Date().toISOString();
      }
      setStored('reports', raw);
      return true;
    }
    return false;
  }

  static getAuditLogs() {
    return getStored('admin_audit', INITIAL_AUDIT);
  }

  static addAuditLog({ action, target_type, target_id, details }) {
    const logs = [...getStored('admin_audit', INITIAL_AUDIT)];
    const activeUser = this.getActiveUser();
    logs.unshift({
      id: `aud-${Date.now()}`,
      admin_id: activeUser?.id || 'user-admin',
      action,
      target_type,
      target_id: String(target_id || ''),
      details: typeof details === 'object' ? details : { message: details },
      created_at: new Date().toISOString(),
    });
    setStored('admin_audit', logs);
  }

  static getContactMessages() {
    return getStored('contact_messages', INITIAL_CONTACT_MESSAGES);
  }

  static updateContactMessage(id, status) {
    const msgs = [...getStored('contact_messages', INITIAL_CONTACT_MESSAGES)];
    const target = msgs.find((m) => m.id === id);
    if (target) {
      target.status = status;
      setStored('contact_messages', msgs);
      return true;
    }
    return false;
  }

  static deleteContactMessage(id) {
    let msgs = getStored('contact_messages', INITIAL_CONTACT_MESSAGES);
    msgs = msgs.filter((m) => m.id !== id);
    setStored('contact_messages', msgs);
    return true;
  }

  static unhideListing(p_id) {
    const listings = [...this.getListings()];
    const book = listings.find((b) => b.id === p_id);
    if (book) {
      book.status = 'active';
      setStored('listings', listings);
      return true;
    }
    return false;
  }

  static deleteListingPermanent(p_id) {
    let listings = this.getListings();
    listings = listings.filter((b) => b.id !== p_id);
    setStored('listings', listings);
    return true;
  }

  static setUserStatus(userId, status, reason = '') {
    const users = [...this.getUsers()];
    const target = users.find((u) => u.id === userId);
    if (target) {
      target.account_status = status;
      setStored('users', users);
    }
    if (status === 'suspended' || status === 'deleted') {
      const listings = [...this.getListings()];
      listings.forEach((b) => {
        if (b.seller_id === userId && b.status === 'active') {
          b.status = 'removed';
        }
      });
      setStored('listings', listings);

      const requests = [...this.getRequests()];
      requests.forEach((r) => {
        if ((r.buyer_id === userId || r.seller_id === userId) && r.status === 'pending') {
          r.status = 'closed';
        }
      });
      setStored('requests', requests);
    }
    return true;
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

  static markListingSold(p_id, asAdmin = false) {
    const activeUser = this.getActiveUser();
    const listings = this.getListings();
    const book = listings.find((b) => b.id === p_id);

    if (!book) throw new Error('Listing not found.');
    if (!asAdmin && activeUser && book.seller_id !== activeUser.id && activeUser.role !== 'admin') {
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

  static removeListing(p_id, asAdmin = false) {
    const activeUser = this.getActiveUser();
    const listings = this.getListings();
    const book = listings.find((b) => b.id === p_id);

    if (!book) throw new Error('Listing not found.');
    if (!asAdmin && activeUser && book.seller_id !== activeUser.id && activeUser.role !== 'admin') {
      throw new Error('Only the seller or admin can remove a listing.');
    }

    book.status = 'removed';
    setStored('listings', listings);
    return true;
  }
}

