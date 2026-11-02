/**
 * BookLoop Demo Data & SVG Cover Generator
 * Realistic Indian academic textbook catalog with verified student sellers.
 */

// Helper to generate a crisp, vector SVG textbook cover as a data URI
export function generateCoverSvg({ title, author, category, colorHex, accentHex }) {
  const cleanTitle = (title || 'Textbook').replace(/[<>&"]/g, '');
  const cleanAuthor = (author || 'Author').replace(/[<>&"]/g, '');
  const cleanCategory = (category || 'Academic').toUpperCase().replace(/[<>&"]/g, '');

  // Wrap title text into 2-3 lines if long
  const words = cleanTitle.split(' ');
  const line1 = words.slice(0, 3).join(' ');
  const line2 = words.slice(3, 7).join(' ');
  const line3 = words.slice(7, 10).join(' ');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colorHex}" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <linearGradient id="spine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Book Background -->
  <rect width="400" height="520" fill="url(#grad)" rx="8" />

  <!-- Spine Shadow -->
  <rect x="0" y="0" width="28" height="520" fill="url(#spine)" />
  <line x1="28" y1="0" x2="28" y2="520" stroke="rgba(255,255,255,0.15)" stroke-width="2" />

  <!-- Category Tag -->
  <rect x="44" y="36" width="160" height="26" rx="4" fill="${accentHex}" fill-opacity="0.25" stroke="${accentHex}" stroke-width="1.5" />
  <text x="52" y="53" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="${accentHex}" letter-spacing="1.2">${cleanCategory}</text>

  <!-- Title Lines -->
  <text x="44" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#FFFFFF">${line1}</text>
  ${line2 ? `<text x="44" y="148" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#FFFFFF">${line2}</text>` : ''}
  ${line3 ? `<text x="44" y="181" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#E5E7EB">${line3}</text>` : ''}

  <!-- Decorative Separator Line -->
  <line x1="44" y1="210" x2="120" y2="210" stroke="${accentHex}" stroke-width="4" stroke-linecap="round" />

  <!-- Author -->
  <text x="44" y="245" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#D1D5DB">by ${cleanAuthor}</text>

  <!-- Book Icon Graphic -->
  <g transform="translate(140, 290)">
    <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,0.06)" />
    <path d="M40 45 L60 38 L80 45 L80 82 L60 76 L40 82 Z" fill="none" stroke="${accentHex}" stroke-width="3" stroke-linejoin="round" />
    <line x1="60" y1="38" x2="60" y2="76" stroke="${accentHex}" stroke-width="2.5" />
    <path d="M40 54 L60 48 L80 54" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
    <path d="M40 64 L60 58 L80 64" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
  </g>

  <!-- Badge at bottom -->
  <rect x="44" y="452" width="312" height="36" rx="6" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
  <text x="56" y="475" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#9CA3AF">BOOKLOOP VERIFIED TEXTBOOK</text>
  <circle cx="334" cy="470" r="6" fill="${accentHex}" />
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_INSTITUTIONS = [
  { id: 'inst-1', name: 'Acropolis Institute of Technology and Research', institution_type: 'college', city: 'Indore', area: 'Khandwa Road', is_active: true },
  { id: 'inst-2', name: 'IET DAVV', institution_type: 'college', city: 'Indore', area: 'Khandwa Road', is_active: true },
  { id: 'inst-3', name: 'SGSITS', institution_type: 'college', city: 'Indore', area: 'Vallabh Nagar', is_active: true },
  { id: 'inst-4', name: 'IIT Indore', institution_type: 'college', city: 'Indore', area: 'Simrol', is_active: true },
  { id: 'inst-5', name: 'Medicaps University', institution_type: 'college', city: 'Indore', area: 'Rau', is_active: true },
  { id: 'inst-6', name: 'IPS Academy', institution_type: 'college', city: 'Indore', area: 'Rajendra Nagar', is_active: true },
];

export const DEMO_CATEGORIES = [
  { id: 'cat-cs', name: 'Computer Science', is_active: true },
  { id: 'cat-ee', name: 'Electrical Engineering', is_active: true },
  { id: 'cat-math', name: 'Mathematics', is_active: true },
  { id: 'cat-phys', name: 'Physics', is_active: true },
  { id: 'cat-chem', name: 'Chemistry', is_active: true },
  { id: 'cat-mgmt', name: 'Management', is_active: true },
  { id: 'cat-eng', name: 'Engineering', is_active: true },
  { id: 'cat-exam', name: 'Competitive Exams', is_active: true },
];

export const DEMO_USERS = [
  {
    id: 'user-kushagra',
    email: 'kushagrasingh@gmail.com',
    display_name: 'Kushagra Singh Tomar',
    institution_id: 'inst-1',
    course_or_class: 'B.Tech CSE, 3rd Year',
    graduation_year: 2026,
    whatsapp_number: '+919826012345',
    role: 'user',
    account_status: 'active',
  },
  {
    id: 'user-bhagyesh',
    email: 'bhagyeshjain@gmail.com',
    display_name: 'Bhagyesh Jain',
    institution_id: 'inst-1',
    course_or_class: 'B.Tech CSE, 4th Year',
    graduation_year: 2025,
    whatsapp_number: '+919876543210',
    role: 'user',
    account_status: 'active',
  },
  {
    id: 'user-admin',
    email: 'admin@bookloop.test',
    display_name: 'BookLoop Admin',
    institution_id: 'inst-1',
    course_or_class: 'Campus Administration',
    graduation_year: 2024,
    whatsapp_number: '+919800011223',
    role: 'admin',
    account_status: 'active',
  },
  {
    id: 'user-priya',
    email: 'priya.nair@ietdavv.edu',
    display_name: 'Priya Nair',
    institution_id: 'inst-2',
    course_or_class: 'B.Tech IT, 2nd Year',
    graduation_year: 2027,
    whatsapp_number: '+919826099887',
    role: 'user',
    account_status: 'active',
  },
  {
    id: 'user-rohan',
    email: 'rohan.verma@sgsits.ac.in',
    display_name: 'Rohan Verma',
    institution_id: 'inst-3',
    course_or_class: 'B.Tech Electrical, 3rd Year',
    graduation_year: 2026,
    whatsapp_number: '+919893012345',
    role: 'user',
    account_status: 'active',
  },
];

export const INITIAL_DEMO_BOOKS = [
  {
    id: 'book-1',
    title: 'Operating System Concepts (10th Dinosaur Edition)',
    author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne',
    edition: '10th Edition',
    category_id: 'cat-cs',
    course_or_exam: 'CS301 / Operating Systems',
    condition: 'good',
    price_paise: 42000, // ₹420
    status: 'active',
    seller_id: 'user-bhagyesh',
    institution_id: 'inst-1',
    description: 'Crisp copy with no missing or torn pages. Covers virtual memory, scheduling, file systems, and concurrency in depth.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    cover_color: '#1E3A8A',
    accent_color: '#60A5FA',
  },
  {
    id: 'book-2',
    title: 'Introduction to Algorithms (CLRS 3rd Edition)',
    author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
    edition: '3rd Edition',
    category_id: 'cat-cs',
    course_or_exam: 'CS402 / Design & Analysis of Algorithms',
    condition: 'like_new',
    price_paise: 65000, // ₹650
    status: 'active',
    seller_id: 'user-bhagyesh',
    institution_id: 'inst-1',
    description: 'The standard bible for algorithms. Pristine condition with zero pencil notes or yellowing. Perfect for semester exams & placements.',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    cover_color: '#1E3A8A',
    accent_color: '#F4C95D',
  },
  {
    id: 'book-3',
    title: 'Higher Engineering Mathematics (44th Edition)',
    author: 'Dr. B.S. Grewal',
    edition: '44th Edition',
    category_id: 'cat-math',
    course_or_exam: 'MA101 / Engineering Mathematics',
    condition: 'good',
    price_paise: 35000, // ₹350
    status: 'active',
    seller_id: 'user-kushagra',
    institution_id: 'inst-1',
    description: 'Comprehensive math guide for all engineering streams. Contains solved university questions for calculus, matrices, and differential equations.',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    cover_color: '#4338CA',
    accent_color: '#A5B4FC',
  },
  {
    id: 'book-4',
    title: 'Database System Concepts (6th Edition)',
    author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
    edition: '6th Edition',
    category_id: 'cat-cs',
    course_or_exam: 'CS403 / Database Management Systems',
    condition: 'fair',
    price_paise: 30000, // ₹300
    status: 'active',
    seller_id: 'user-bhagyesh',
    institution_id: 'inst-1',
    description: 'Very helpful reference covering ER diagrams, relational calculus, normalization up to BCNF, and SQL queries.',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    cover_color: '#1E3A8A',
    accent_color: '#93C5FD',
  },
  {
    id: 'book-5',
    title: 'Data Structures and Algorithms in C++',
    author: 'Mark Allen Weiss',
    edition: '4th Edition',
    category_id: 'cat-cs',
    course_or_exam: 'CS201 / Data Structures',
    condition: 'like_new',
    price_paise: 48000, // ₹480
    status: 'active',
    seller_id: 'user-priya',
    institution_id: 'inst-2',
    description: 'Excellent condition with full code snippets for AVL trees, red-black trees, graphs, and dynamic programming.',
    created_at: new Date(Date.now() - 3600000 * 16).toISOString(),
    cover_color: '#0F766E',
    accent_color: '#2DD4BF',
  },
  {
    id: 'book-6',
    title: 'Concepts of Physics (Vol 1 & Vol 2 Set)',
    author: 'Dr. H.C. Verma',
    edition: 'Latest Edition',
    category_id: 'cat-phys',
    course_or_exam: 'PH101 / Engineering Physics',
    condition: 'like_new',
    price_paise: 29000, // ₹290
    status: 'active',
    seller_id: 'user-rohan',
    institution_id: 'inst-3',
    description: 'Both volumes included together. Pristine pages, clear diagrams for classical mechanics, wave optics, and electrodynamics.',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    cover_color: '#047857',
    accent_color: '#34D399',
  },
  {
    id: 'book-7',
    title: 'Computer Networking: A Top-Down Approach (7th Edition)',
    author: 'James F. Kurose, Keith W. Ross',
    edition: '7th Edition',
    category_id: 'cat-cs',
    course_or_exam: 'CS501 / Computer Networks',
    condition: 'good',
    price_paise: 52000, // ₹520
    status: 'active',
    seller_id: 'user-bhagyesh',
    institution_id: 'inst-1',
    description: 'Clean textbook explaining application layer (HTTP/DNS), transport (TCP/UDP), routing algorithms, and Wireshark trace exercises.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    cover_color: '#1E3A8A',
    accent_color: '#FCD34D',
  },
  {
    id: 'book-8',
    title: 'Basic Electrical Engineering (Revised Ed)',
    author: 'D.C. Kulshreshtha',
    edition: '2nd Edition',
    category_id: 'cat-ee',
    course_or_exam: 'EE101 / Basic Electrical',
    condition: 'good',
    price_paise: 26000, // ₹260
    status: 'active',
    seller_id: 'user-kushagra',
    institution_id: 'inst-1',
    description: 'Clear explanations with solved numericals for Thevenin theorem, Norton theorem, AC transients, and 3-phase induction motors.',
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    cover_color: '#B45309',
    accent_color: '#FBBF24',
  },
  {
    id: 'book-9',
    title: 'Quantitative Aptitude for Competitive Exams',
    author: 'Dr. R.S. Aggarwal',
    edition: 'Revised Edition',
    category_id: 'cat-exam',
    course_or_exam: 'Campus Placements & GATE',
    condition: 'good',
    price_paise: 18000, // ₹180
    status: 'active',
    seller_id: 'user-bhagyesh',
    institution_id: 'inst-1',
    description: 'The golden book for campus placement tests, TCS NQT, and competitive exams. Clean pages, no torn corners.',
    created_at: new Date(Date.now() - 3600000 * 32).toISOString(),
    cover_color: '#831843',
    accent_color: '#F472B6',
  },
  {
    id: 'book-10',
    title: 'Digital Design: With an Introduction to Verilog HDL',
    author: 'M. Morris Mano, Michael D. Ciletti',
    edition: '5th Edition',
    category_id: 'cat-eng',
    course_or_exam: 'EC202 / Digital Systems',
    condition: 'fair',
    price_paise: 31000, // ₹310
    status: 'active',
    seller_id: 'user-priya',
    institution_id: 'inst-2',
    description: 'Detailed coverage of K-maps, sequential circuits, flip-flops, registers, and basic Verilog hardware descriptions.',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    cover_color: '#1E293B',
    accent_color: '#38BDF8',
  },
  {
    id: 'book-11',
    title: 'Organic Chemistry (7th Edition)',
    author: 'Robert T. Morrison, Robert N. Boyd',
    edition: '7th Edition',
    category_id: 'cat-chem',
    course_or_exam: 'CH101 / Engineering Chemistry',
    condition: 'like_new',
    price_paise: 45000, // ₹450
    status: 'active',
    seller_id: 'user-kushagra',
    institution_id: 'inst-1',
    description: 'Hardcover volume in great condition. Clear reaction mechanisms, stereochemistry, and synthesis pathways.',
    created_at: new Date(Date.now() - 3600000 * 40).toISOString(),
    cover_color: '#0F766E',
    accent_color: '#5EEAD4',
  },
  {
    id: 'book-12',
    title: 'Financial Management: Theory & Practice',
    author: 'Prasanna Chandra',
    edition: '10th Edition',
    category_id: 'cat-mgmt',
    course_or_exam: 'MBA / Engineering Economics',
    condition: 'fair',
    price_paise: 38000, // ₹380
    status: 'active',
    seller_id: 'user-rohan',
    institution_id: 'inst-3',
    description: 'Great guide for capital budgeting, financial ratios, time value of money, and dividend policy.',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    cover_color: '#7C2D12',
    accent_color: '#FB923C',
  },
];
