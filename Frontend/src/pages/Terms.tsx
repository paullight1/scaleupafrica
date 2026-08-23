import { Link } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";

const LAST_UPDATED = "23 August 2026";

const Terms = () => (
  <>
    <SEO
      title="Terms of Service"
      description="Terms governing Cresciva's public directory, membership and funding-intelligence services."
      noindex
    />

    <section className="bg-navy px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <PageHeader onDark title="Terms of Service" subtitle={`Last updated: ${LAST_UPDATED}`} />
      </div>
    </section>

    <section className="bg-background px-6 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div role="note" className="mb-10 rounded-xl border border-border bg-surface-subtle p-5 text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-ink-strong">Please note:</strong> These terms describe the current Cresciva product in good faith. They are not legal advice and should be reviewed by qualified counsel for the jurisdictions in which Cresciva operates.
        </div>

        <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-ink-strong prose-h2:text-2xl prose-h2:font-bold prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary-dark prose-strong:text-ink-strong dark:prose-invert">
          <p>
            These Terms of Service ("Terms") govern your use of Cresciva's public business directory, membership features and funding-intelligence services (the "Service"). By using the Service you agree to these Terms and our <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>1. Accounts and profiles</h2>
          <p>
            You are responsible for information submitted through your account and for keeping your credentials secure. Published business-profile fields are public. Contact fields are public only to the extent permitted by the visibility controls available in the product. Do not submit information you are not authorised to publish.
          </p>

          <h2>2. Membership and payments</h2>
          <p>
            Funding Radar and other premium features require an active annual membership. Cresciva currently sells a one-time annual access period rather than an automatically recurring subscription. The amount, currency and access term shown at checkout control your purchase.
          </p>
          <ul>
            <li><strong>Payments.</strong> Checkout is processed by Bachs. Cresciva does not store full card or bank-account credentials.</li>
            <li><strong>Activation.</strong> Access is granted only after Cresciva verifies a successful provider settlement against the internal payment ledger.</li>
            <li><strong>Renewal.</strong> Annual access does not auto-renew under the current implementation. A future renewal requires a new authorised purchase unless Cresciva expressly introduces and discloses another billing model.</li>
            <li><strong>Refunds.</strong> Refund requests are reviewed according to applicable law, the circumstances of the transaction and the support process communicated by Cresciva. Contact us promptly if you believe a charge is incorrect.</li>
          </ul>

          <h2>3. Funding intelligence</h2>
          <p>
            Cresciva helps members discover and rank third-party funding opportunities. A <strong>verified</strong> label means Cresciva has source evidence recorded for that opportunity as of the displayed check time; it does not guarantee that a funder will accept an application or award funding. An <strong>open</strong>, <strong>closing soon</strong> or <strong>rolling</strong> status reflects Cresciva's current-cycle source evidence and can change when the funder changes its programme.
          </p>
          <p>
            AI-assisted discoveries that have not passed the source-verification process are presented separately and must not be treated as verified opportunities. You remain responsible for confirming the final application instructions, eligibility criteria and deadline on the funder's official source before submitting an application.
          </p>

          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>publish false, misleading, unlawful or infringing content;</li>
            <li>harvest, scrape or resell directory or funding data in bulk without permission;</li>
            <li>attempt to access another user's private data or restricted operational systems;</li>
            <li>upload malicious content or interfere with service security or availability;</li>
            <li>use Cresciva to harass, impersonate, defraud or harm another person or organisation.</li>
          </ul>

          <h2>5. Third-party services and links</h2>
          <p>
            Cresciva relies on third-party infrastructure and links to funder websites that Cresciva does not control. Third-party services have their own terms and privacy practices. A source link may change or become unavailable after Cresciva checks it.
          </p>

          <h2>6. Intellectual property</h2>
          <p>
            Cresciva's software, design, brand and original service content are protected by applicable intellectual-property laws. You retain ownership of content you submit and grant Cresciva the permissions reasonably required to host, process and publish the content according to your selected product settings.
          </p>

          <h2>7. Availability and warranties</h2>
          <p>
            The Service is provided on an "as is" and "as available" basis to the extent permitted by law. Cresciva does not guarantee uninterrupted availability, a particular funding outcome, or that third-party programmes will remain unchanged after verification.
          </p>

          <h2>8. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by applicable law, Cresciva is not liable for indirect or consequential loss arising solely from a third-party funding decision, changed funder information or service interruption. Nothing in these Terms excludes rights or liabilities that cannot lawfully be excluded.
          </p>

          <h2>9. Suspension and termination</h2>
          <p>
            You may stop using Cresciva at any time. Cresciva may restrict or terminate access for material misuse, security risk or breach of these Terms. You can request account deletion from Account settings; limited payment/accounting records may be retained in detached form where required for reconciliation or legal obligations.
          </p>

          <h2>10. Changes to these terms</h2>
          <p>
            Cresciva may update these Terms as the Service or legal requirements change. Material changes will be reflected by an updated date and additional notice where appropriate.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions, payment concerns or legal/data-rights requests can be submitted through the monitored <Link to="/contact">Cresciva contact page</Link>.
          </p>
        </div>
      </div>
    </section>
  </>
);

export default Terms;
