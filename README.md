# BookLoop — Campus Book Marketplace

> **Campus Second-Hand Textbook Marketplace**  
> Developed by **Kushagra Singh Tomar** & **Bhagyesh Jain**  
> *Acropolis Institute of Technology and Research (AITR), Indore*

---

BookLoop is a student-first peer-to-peer campus marketplace for buying, selling, and giving away used academic books, textbooks, notes, and study guides. 

Built with **React 18**, **Vite**, and **Supabase** (PostgreSQL, Row Level Security, Auth, and Storage) following the **BookLoop Engineer-Ready MVP Brief**.

> 📖 **Full Setup & Deployment Guide**: For end-to-end instructions on setting up Supabase, running SQL migrations, provisioning accounts, and deploying to Vercel, see the [**Complete Instruction Manual (INSTRUCTION_MANUAL.md)**](./INSTRUCTION_MANUAL.md).

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, React Router v6, plain responsive CSS with custom design tokens.
  - Colors: Navy `#243B64`, Soft Blue `#EAF2FF`, Background `#FAFAF7`, Gold `#F4C95D`, Dark `#252525`.
  - Responsive down to 360px viewport; WCAG AA contrast compliant; touch targets ≥ 44px; accessible `:focus-visible` styling; prefers-reduced-motion support.
- **Backend & Database**: Supabase PostgreSQL with strict Row Level Security (RLS) on all tables.
- **Authentication**: Supabase Auth (email/password with institution verification flow).
- **Storage**: Supabase Storage (`listing-images` bucket) with user-folder isolation and file validation.
- **Security**: Zero custom backend server. All database operations run through authenticated client queries protected by PostgreSQL RLS or SECURITY DEFINER stored procedures with locked `search_path`. The frontend uses **only** the Supabase anonymous key (`VITE_SUPABASE_ANON_KEY`). The service role key is never bundled, exposed, or committed.

---

## 📁 Repository Structure

```text
bookloop/
├── web/                       # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/        # Reusable UI, layout, and auth guard components
│   │   ├── context/           # AuthContext (session, profile, role state)
│   │   ├── lib/               # Supabase client, money helpers, storage helpers
│   │   ├── pages/             # Route pages (Home, Search, Details, Sell, Profile, etc.)
│   │   └── styles/            # CSS tokens and global base styles
│   ├── .env.example           # Frontend environment variable template
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite configuration
├── supabase/
│   └── migrations/            # Sequential SQL migrations (0001 - 0005)
├── scripts/
│   ├── create_base_users.mjs  # Local Node provisioner for base accounts
│   └── .env.example           # Admin credentials template
├── tests/
│   └── seed_and_security.test.mjs # Integration and RLS test suite (43+ assertions)
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- A Supabase project

### 1. Configure Frontend Environment

Navigate to the `web` directory and set up your local environment file:

```bash
cd web
cp .env.example .env.local
```

Edit `web/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Install Dependencies & Run

```bash
npm install
npm run dev
```

The application will be running locally at `http://localhost:5173`.

---

## 🗄️ Database Setup

Migrations are located in `supabase/migrations/` and should be executed in order in your Supabase SQL Editor:

1. `0001_schema.sql` — Schema definition: tables (`institutions`, `categories`, `profiles`, `profile_private`, `listings`, `listing_images`, `interest_requests`, `reports`, `user_blocks`, `admin_audit`, `admin_roles`, `contact_messages`), indexes, and triggers.
2. `0002_rls.sql` — Row Level Security (RLS) policies for all tables.
3. `0003_functions.sql` — SECURITY DEFINER stored procedures with input validation.
4. `0004_storage.sql` — Storage bucket configuration and image security policies.
5. `0005_institution_type.sql` — Institution type support (School vs. College).

---

## 👤 Base User Provisioning

To provision your official base accounts (Kushagra, Bhagyesh, and BookLoop Admin):

1. Set credentials in `scripts/.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SEED_ADMIN_EMAIL=admin@bookloop.test
   ```
2. Run the provisioning script:
   ```bash
   node scripts/create_base_users.mjs
   ```

Credentials will be displayed once and saved to `scripts/.credentials.local` (which is gitignored).

---

## ⚠️ Testing & Seeding Safety Notice

> [!WARNING]
> The automated test suite (`tests/seed_and_security.test.mjs`) and benchmark seed script (`scripts/seed.mjs`) must **ONLY** be executed against a **separate, dedicated test Supabase project**, never against your production or clean demonstration database.

- `scripts/seed.mjs` populates demo records (`@demo.test` users, listings, requests) and will refuse to execute unless `SEED_ALLOWED=true` and `SEED_DEMO_PASSWORD` are explicitly set in `scripts/.env`.
- To run integration tests against a test project:
  ```bash
  # Inside web/ or root with test environment configured
  npm --prefix web test
  ```

---

## 🌐 Production Deployment

1. **Build**:
   ```bash
   cd web
   npm run build
   ```
2. **Deploy to Vercel / Netlify**:
   - Set Build Command: `npm run build`
   - Set Output Directory: `dist`
   - Configure Single Page Application (SPA) rewrites to redirect all routes to `index.html`.
   - Set Environment Variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
3. **Configure Supabase Auth Settings**:
   - In Supabase Dashboard > Authentication > URL Configuration:
     - Set **Site URL** to your production domain (e.g. `https://your-domain.vercel.app`).
     - Add `https://your-domain.vercel.app/**` to **Redirect URLs**.

---

## 📄 License

MIT
