import React from 'react';
import { Card } from '../components/ui/Card';

export function SafetyPage() {
  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-12)', maxWidth: '800px' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
          Campus Safety Guidelines
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
          Practical guidelines to ensure every textbook exchange is safe, pleasant, and verified.
        </p>
      </header>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 'var(--line-height-relaxed)' }}>
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.5rem' }}>🏛️</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', margin: 0 }}>
              1. Meet in a Public, Staffed Campus Location During Daytime
            </h2>
          </div>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            Always schedule meetups on your university campus during daylight hours. Ideal exchange locations include:
          </p>
          <ul style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <li>Campus main library entrance or circulation desk</li>
            <li>Student union or college cafeteria during lunch hours</li>
            <li>Departmental common rooms or academic building foyers</li>
          </ul>
          <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginTop: 'var(--space-2)' }}>
            Never agree to meet in isolated locations, private dorm rooms, off-campus alleys, or unlit parking lots.
          </p>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.5rem' }}>📖</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', margin: 0 }}>
              2. Inspect the Textbook Thoroughly Before Paying
            </h2>
          </div>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            As a buyer, take 2–3 minutes to inspect the book before completing the transaction:
          </p>
          <ul style={{ paddingLeft: 'var(--space-5)', color: 'var(--color-text)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <li>Verify the title, edition number, and ISBN match your course syllabus.</li>
            <li>Flip through pages to check for missing chapters, torn binding, or excessive highlighting.</li>
            <li>Confirm that access codes or companion workbooks (if advertised) are intact.</li>
          </ul>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.5rem' }}>💵</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', margin: 0 }}>
              3. Pay on the Spot — Never Pay in Advance
            </h2>
          </div>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            <strong>Never transfer money prior to meeting in person.</strong> Avoid advance deposits, booking fees, or courier charges. Settle the agreed price on the spot using cash or instant campus UPI once you have physically verified the book.
          </p>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.5rem' }}>👥</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', margin: 0 }}>
              4. Involve a Trusted Peer or Adult
            </h2>
          </div>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            If you ever feel uncertain, bring a classmate or friend with you to the exchange point. For younger students or first-year undergraduates, involving a trusted friend, roommate, or adult guardian ensures added confidence and safety.
          </p>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.5rem' }}>📍</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', margin: 0 }}>
              5. Guard Your Privacy — No Live Location Sharing
            </h2>
          </div>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            Do not share live GPS location links, personal home addresses, or sensitive credentials with anyone on the platform. Agree on a specific static campus landmark (e.g. <em>"Near the library steps at 2:00 PM"</em>) instead of tracking live movement.
          </p>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.5rem' }}>🚩</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-navy)', margin: 0 }}>
              6. Report Suspicious Behavior
            </h2>
          </div>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
            If any user pressures you, requests advance money, offers prohibited material, or acts suspiciously, use the <strong>Report Listing</strong> or <strong>Block Seller</strong> links on their listing immediately. You can also reach our moderation team directly via <a href="/contact" style={{ color: 'var(--color-navy)', fontWeight: 'var(--font-weight-semibold)' }}>Contact Administrator</a>.
          </p>
        </section>
      </Card>
    </div>
  );
}
