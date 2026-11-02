/**
 * BookLoop Seamless Demo/Mock Supabase Client
 * Intercepts Supabase queries when offline or when VITE_SUPABASE_URL is missing.
 * Allows the entire app to run with full interactive functionality,
 * realistic Indian textbooks, and Kushagra & Bhagyesh accounts!
 */

import { DemoStore } from './demoStore';

class MockQueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.sortField = null;
    this.sortAscending = true;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.selectQuery = '*';
    this.updateData = null;
    this.insertData = null;
  }

  select(fields = '*') {
    this.selectQuery = fields;
    return this;
  }

  eq(field, val) {
    this.filters.push({ type: 'eq', field, val });
    return this;
  }

  in(field, values) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  order(field, opts = {}) {
    this.sortField = field;
    this.sortAscending = opts.ascending !== false;
    return this;
  }

  single() {
    this.isSingle = true;
    return this.exec();
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this.exec();
  }

  update(data) {
    this.updateData = data;
    return this;
  }

  insert(data) {
    this.insertData = data;
    return this.execInsert();
  }

  delete() {
    return this;
  }

  // Promise then/catch support for direct await
  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  async execInsert() {
    if (this.table === 'reports') {
      return { data: { id: `rep-${Date.now()}` }, error: null };
    }
    if (this.table === 'contact_messages') {
      return { data: { id: `msg-${Date.now()}` }, error: null };
    }
    if (this.table === 'user_blocks') {
      return { data: { id: `blk-${Date.now()}` }, error: null };
    }
    return { data: this.insertData, error: null };
  }

  async exec() {
    let result = [];
    const activeUser = DemoStore.getActiveUser();

    // 1. Table specific sourcing
    if (this.table === 'categories') {
      result = [...DemoStore.getCategories()];
    } else if (this.table === 'institutions') {
      result = [...DemoStore.getInstitutions()];
    } else if (this.table === 'listings') {
      const all = DemoStore.getListings();
      const institutions = DemoStore.getInstitutions();
      const categories = DemoStore.getCategories();
      const users = DemoStore.getUsers();

      result = all.map((b) => ({
        ...b,
        institution: institutions.find((i) => i.id === b.institution_id) || { name: 'AITR Indore', city: 'Indore' },
        category: categories.find((c) => c.id === b.category_id) || { name: 'Computer Science' },
        seller: users.find((u) => u.id === b.seller_id) || { id: b.seller_id, display_name: 'Campus Student' },
        listing_images: b.listing_images || [{ id: 'img-1', storage_path: b.images?.[0], display_order: 1 }],
      }));
    } else if (this.table === 'profiles') {
      const users = DemoStore.getUsers();
      const institutions = DemoStore.getInstitutions();
      result = users.map((u) => ({
        id: u.id,
        display_name: u.display_name,
        institution_id: u.institution_id,
        course_or_class: u.course_or_class,
        graduation_year: u.graduation_year,
        created_at: '2026-08-01T00:00:00Z',
        institution: institutions.find((i) => i.id === u.institution_id) || { name: 'AITR Indore', city: 'Indore' },
        private: { whatsapp_number: u.whatsapp_number, account_status: u.account_status || 'active' },
      }));
    } else if (this.table === 'reports') {
      result = [
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
          reporter: { display_name: 'Priya Nair' },
          reported_user: { display_name: 'Bhagyesh Jain' },
          listing: { id: 'book-1', title: 'Operating System Concepts (10th Dinosaur Edition)' },
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
          reporter: { display_name: 'Rohan Verma' },
          reported_user: { display_name: 'Kushagra Singh Tomar' },
          listing: { id: 'book-3', title: 'Higher Engineering Mathematics' },
        },
      ];
    } else if (this.table === 'admin_audit') {
      result = [
        {
          id: 'aud-1',
          admin_user_id: 'user-admin',
          action: 'institution_verified',
          target_type: 'institution',
          target_id: 'inst-1',
          details: 'Verified Acropolis Institute of Technology and Research campus domain',
          created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        },
        {
          id: 'aud-2',
          admin_user_id: 'user-admin',
          action: 'report_resolved',
          target_type: 'report',
          target_id: 'rep-2',
          details: 'Reviewed and closed test report on Higher Engineering Mathematics',
          created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        },
        {
          id: 'aud-3',
          admin_user_id: 'user-admin',
          action: 'account_approved',
          target_type: 'user',
          target_id: 'user-kushagra',
          details: 'Verified campus credentials for Kushagra Singh Tomar',
          created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
        },
      ];
    } else if (this.table === 'contact_messages') {
      result = [
        {
          id: 'cmsg-1',
          name: 'Aditya Mehta',
          email: 'aditya.mehta@aitr.ac.in',
          subject: 'Question about book handover points on campus',
          message: 'Hi Admin, where is the designated safety meet point inside AITR campus?',
          created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
        },
        {
          id: 'cmsg-2',
          name: 'Sneha Patel',
          email: 'sneha@dpsindore.edu',
          subject: 'School textbook request for Class 12 CBSE',
          message: 'Can we add NCERT Physics and Chemistry to the standard categories?',
          created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
        },
      ];
    } else if (this.table === 'profile_private') {
      const users = DemoStore.getUsers();
      result = users.map((u) => ({
        user_id: u.id,
        whatsapp_number: u.whatsapp_number,
        account_status: u.account_status,
      }));
    } else if (this.table === 'admin_roles') {
      const users = DemoStore.getUsers();
      result = users
        .filter((u) => u.role === 'admin')
        .map((u) => ({ user_id: u.id, role: 'admin' }));
    } else if (this.table === 'interest_requests') {
      const allReqs = DemoStore.getRequests();
      const listings = DemoStore.getListings();
      const users = DemoStore.getUsers();

      result = allReqs.map((r) => {
        const book = listings.find((b) => b.id === r.listing_id);
        const buyer = users.find((u) => u.id === r.buyer_id);
        const seller = users.find((u) => u.id === r.seller_id);
        return {
          ...r,
          listing: book ? {
            ...book,
            images: book.images || [],
            listing_images: book.listing_images || [{ storage_path: book.images?.[0] }],
          } : null,
          buyer: buyer ? { id: buyer.id, display_name: buyer.display_name } : null,
          seller: seller ? { id: seller.id, display_name: seller.display_name } : null,
        };
      });
    }

    // 2. Handle Update
    if (this.updateData) {
      if (this.table === 'profiles') {
        const users = DemoStore.getUsers();
        const idFilter = this.filters.find((f) => f.field === 'id')?.val;
        const u = users.find((x) => x.id === idFilter);
        if (u) {
          Object.assign(u, this.updateData);
          localStorage.setItem('bookloop_demo_users', JSON.stringify(users));
        }
      } else if (this.table === 'profile_private') {
        const users = DemoStore.getUsers();
        const idFilter = this.filters.find((f) => f.field === 'user_id')?.val;
        const u = users.find((x) => x.id === idFilter);
        if (u && this.updateData.whatsapp_number !== undefined) {
          u.whatsapp_number = this.updateData.whatsapp_number;
          localStorage.setItem('bookloop_demo_users', JSON.stringify(users));
        }
      }
      return { data: this.updateData, error: null };
    }

    // 3. Apply Filters
    for (const f of this.filters) {
      if (f.type === 'eq') {
        result = result.filter((row) => row[f.field] === f.val);
      } else if (f.type === 'in') {
        result = result.filter((row) => f.values.includes(row[f.field]));
      }
    }

    // 4. Apply Sorting
    if (this.sortField) {
      result.sort((a, b) => {
        const valA = a[this.sortField];
        const valB = b[this.sortField];
        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    // 5. Single / MaybeSingle
    if (this.isSingle || this.isMaybeSingle) {
      const singleRow = result.length > 0 ? result[0] : null;
      if (this.isSingle && !singleRow) {
        return { data: null, error: new Error('Record not found.') };
      }
      return { data: singleRow, error: null };
    }

    return { data: result, error: null };
  }
}

export function createMockClient() {
  return {
    from(table) {
      return new MockQueryBuilder(table);
    },

    async rpc(funcName, params = {}) {
      try {
        if (funcName === 'search_listings') {
          const res = DemoStore.searchListings({
            query: params.p_query,
            category: params.p_category,
            institution: params.p_institution,
            minPrice: params.p_min,
            maxPrice: params.p_max,
            sort: params.p_sort || 'newest',
            limit: params.p_limit || 24,
            offset: params.p_offset || 0,
          });
          return { data: res.data, count: res.count, error: null };
        }

        if (funcName === 'create_listing') {
          const id = DemoStore.createListing(params);
          return { data: id, error: null };
        }

        if (funcName === 'create_interest_request') {
          const id = DemoStore.createInterestRequest(params);
          return { data: id, error: null };
        }

        if (funcName === 'respond_to_request') {
          DemoStore.respondToRequest(params);
          return { data: null, error: null };
        }

        if (funcName === 'get_seller_contact') {
          const number = DemoStore.getSellerContact(params.p_request_id);
          return { data: number, error: null };
        }

        if (funcName === 'mark_listing_sold') {
          DemoStore.markListingSold(params.p_id);
          return { data: null, error: null };
        }

        if (funcName === 'remove_listing') {
          DemoStore.removeListing(params.p_id);
          return { data: null, error: null };
        }

        if (funcName === 'admin_stats' || funcName === 'admin_get_stats') {
          const listings = DemoStore.getListings();
          const requests = DemoStore.getRequests();
          const users = DemoStore.getUsers();
          return {
            data: {
              active_listings: listings.filter((b) => b.status === 'active').length,
              sold_listings: listings.filter((b) => b.status === 'sold').length,
              total_users: users.length,
              pending_requests: requests.filter((r) => r.status === 'pending').length,
              accepted_requests: requests.filter((r) => r.status === 'accepted').length,
              open_reports: 1,
            },
            error: null,
          };
        }

        if (funcName === 'admin_update_report') {
          return { data: { success: true }, error: null };
        }

        if (funcName === 'admin_hide_listing') {
          if (params.p_listing_id) {
            const list = DemoStore.getListings();
            const target = list.find((b) => b.id === params.p_listing_id);
            if (target) target.status = 'hidden';
            localStorage.setItem('bookloop_demo_listings', JSON.stringify(list));
          }
          return { data: { success: true }, error: null };
        }

        if (funcName === 'admin_set_user_status') {
          if (params.p_user_id) {
            const users = DemoStore.getUsers();
            const target = users.find((u) => u.id === params.p_user_id);
            if (target) target.account_status = params.p_status;
            localStorage.setItem('bookloop_demo_users', JSON.stringify(users));
          }
          return { data: { success: true }, error: null };
        }

        if (funcName === 'admin_upsert_institution') {
          return { data: { id: params.p_id || `inst-${Date.now()}` }, error: null };
        }

        if (funcName === 'admin_upsert_category') {
          return { data: { id: params.p_id || `cat-${Date.now()}` }, error: null };
        }

        return { data: null, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },

    auth: {
      async getSession() {
        const u = DemoStore.getActiveUser();
        if (!u) return { data: { session: null }, error: null };
        return {
          data: {
            session: {
              access_token: 'demo-token',
              user: { id: u.id, email: u.email, user_metadata: { display_name: u.display_name } },
            },
          },
          error: null,
        };
      },

      onAuthStateChange(callback) {
        const handler = (e) => {
          const u = e.detail;
          const session = u ? {
            access_token: 'demo-token',
            user: { id: u.id, email: u.email, user_metadata: { display_name: u.display_name } },
          } : null;
          callback(u ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        };

        window.addEventListener('bookloop_auth_change', handler);
        return {
          data: {
            subscription: {
              unsubscribe: () => window.removeEventListener('bookloop_auth_change', handler),
            },
          },
        };
      },

      async signInWithPassword({ email }) {
        const users = DemoStore.getUsers();
        const em = (email || '').toLowerCase().trim();
        let found = users.find((u) => u.email.toLowerCase() === em);
        if (!found) {
          if (em.includes('kushagra') || em === 'demo@campus.edu' || em === 'buyer@campus.edu') {
            found = users.find((u) => u.id === 'user-kushagra');
          } else if (em.includes('bhagyesh') || em === 'seller@campus.edu') {
            found = users.find((u) => u.id === 'user-bhagyesh');
          } else if (em.includes('admin')) {
            found = users.find((u) => u.id === 'user-admin');
          }
        }
        if (!found) {
          return { data: null, error: new Error('Invalid email or password. Please use one of the 1-click demo logins or create an account.') };
        }
        DemoStore.setActiveUser(found.id);
        return {
          data: {
            user: { id: found.id, email: found.email },
            session: { access_token: 'demo-token' },
          },
          error: null,
        };
      },

      async signUp({ email, options }) {
        const users = DemoStore.getUsers();
        const em = (email || '').trim().toLowerCase();
        const existing = users.find((u) => u.email.toLowerCase() === em);
        if (existing) {
          DemoStore.setActiveUser(existing.id);
          return { data: { user: existing }, error: null };
        }
        const newId = `user-${Date.now()}`;
        const newUser = {
          id: newId,
          email: em,
          display_name: options?.data?.display_name || em.split('@')[0],
          institution_id: options?.data?.institution_id || 'inst-1',
          course_or_class: options?.data?.course_or_class || 'B.Tech Student',
          whatsapp_number: options?.data?.whatsapp_number || '+919800000000',
          role: 'user',
          account_status: 'active',
        };
        users.push(newUser);
        localStorage.setItem('bookloop_demo_users', JSON.stringify(users));
        DemoStore.setActiveUser(newId);
        return { data: { user: newUser }, error: null };
      },

      async signOut() {
        DemoStore.clearActiveUser();
        return { error: null };
      },
    },

    storage: {
      from(bucket) {
        return {
          getPublicUrl(path) {
            return { data: { publicUrl: path } };
          },
          async upload(path, file) {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                resolve({ data: { path: e.target.result }, error: null });
              };
              reader.readAsDataURL(file);
            });
          },
          async remove() {
            return { data: null, error: null };
          },
        };
      },
    },
  };
}

