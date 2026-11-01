import React from 'react';
import { Card } from '../components/ui/Card';

export function TermsPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-12)', maxWidth: '800px' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
          Terms of Service & Marketplace Rules
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
          Last updated: October 2026 • BookLoop Campus Textbook Marketplace
        </p>
      </header>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 'var(--line-height-relaxed)' }}>
        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            1. Purpose & Student Agreement
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            BookLoop is an online discovery platform connecting university and college students to facilitate physical, in-person exchanges of second-hand course textbooks. By registering an account or listing a book, you agree to abide by these Terms of Service.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
            ⚠️ 2. Prohibited Items: Counterfeit & Pirated Material
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>
            BookLoop strictly prohibits the listing, promotion, or sale of any unauthorized intellectual property. Specifically, you may NOT list:
          </p>
          <ul style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text)', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li>
              <strong>Photocopied or Pirated Reprints:</strong> Unauthorized photocopies, spiral-bound reprints, bootleg commercial printings, or counterfeit book editions.
            </li>
            <li>
              <strong>Digital Scans or PDFs:</strong> Digital textbook files, torrent links, Google Drive links, unlicensed eBooks, or test bank repositories.
            </li>
            <li>
              <strong>Instructor Solution Manuals & Leaked Exams:</strong> Any academic materials that violate university academic integrity codes.
            </li>
            <li>
              <strong>Non-Book or Prohibited Goods:</strong> Merchandise, hardware, illegal contraband, or non-educational items.
            </li>
          </ul>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
            Violation of these rules will result in immediate listing removal, permanent account suspension, and possible escalation to campus student conduct committees.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            3. Accuracy of Listings & Condition Ratings
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            Sellers must provide accurate book titles, authors, editions, and truthful condition grades (Like New, Good, Fair, Poor). Any significant wear, highlighting, missing pages, or loose binding must be clearly stated in the description. Photos must be real photographs of the physical textbook being sold.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            4. In-Person Transactions & Fair Exchange
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            BookLoop does not process payments or collect commission fees. All financial settlements occur directly between buyer and seller during in-person campus handoffs. Buyers have the right and responsibility to inspect the physical book prior to paying. Once the exchange is completed, transactions are final.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            5. Retention & Account Deletion Policy
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            Users may initiate account deletion at any time from their profile settings. Our automated deletion flow immediately closes open listings, revokes interest requests, and queues data for permanent purging in accordance with our data retention schedule.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            6. Moderation & Enforcement
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            Campus administrators and moderators reserve the right to remove any listing, reject interest requests, and suspend or delete accounts that fail to meet these community standards.
          </p>
        </section>
      </Card>
    </div>
  );
}
