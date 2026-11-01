import React from 'react';
import { Card } from '../components/ui/Card';

export function PrivacyPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-12)', maxWidth: '800px' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
          Last updated: October 2026 • BookLoop Campus Textbook Marketplace
        </p>
      </header>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 'var(--line-height-relaxed)' }}>
        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            1. Principles & Data Minimization
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            BookLoop is a student-first, peer-to-peer textbook marketplace built exclusively for campus communities. We adhere strictly to data minimization principles: we only collect the bare minimum information necessary to facilitate safe in-person textbook exchanges.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            2. Information We Collect & How It Is Used
          </h2>
          <ul style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text)', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li>
              <strong>Campus Identity:</strong> Display name, affiliated educational institution, and optional course/graduation year. This information is publicly displayed to fellow campus members on your profile and listings.
            </li>
            <li>
              <strong>Private Contact Information (WhatsApp):</strong> Your phone number is stored in an encrypted database table with strict Row Level Security (RLS). <em>Your phone number is never shown publicly, indexed in search engines, or made available to visitors.</em> It is only disclosed to a buyer when you explicitly click "Accept" on their interest request.
            </li>
            <li>
              <strong>Listings & Images:</strong> Book photos, titles, conditions, and descriptions uploaded to our storage system are publicly visible to facilitate browsing.
            </li>
            <li>
              <strong>Direct Interest Requests:</strong> Messages exchanged between buyers and sellers are visible only to the two participating parties and campus administrators during dispute reviews.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            3. Data Retention & Storage
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            User authentication and listing data are hosted via Supabase Postgres with row-level encryption. Listing records remain active until marked as sold or removed by the seller. Resolved reports and audit logs are retained for a limited period solely for safety and moderation audit trails.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            4. Account Deletion & Right to Be Forgotten
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>
            You maintain full control over your personal data. At any time, you can request account deletion directly from your <strong>Profile &rarr; Account Settings</strong> page via our "Request Account Deletion" button.
          </p>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            Upon confirming deletion:
          </p>
          <ul style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text)', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <li>Your account status is marked for deletion and immediately deactivated.</li>
            <li>All your active textbook listings are hidden from search and catalog results.</li>
            <li>All pending interest requests are automatically closed.</li>
            <li>Your private contact details are erased from the active directory.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            5. Contact Us Regarding Privacy
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            If you have questions regarding our privacy practices or wish to submit a data inquiry, please visit our <a href="/contact" style={{ color: 'var(--color-navy)', fontWeight: 'var(--font-weight-semibold)' }}>Contact Administrator</a> page.
          </p>
        </section>
      </Card>
    </div>
  );
}
