import { Link } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";

const LAST_UPDATED = "23 August 2026";

const Privacy = () => (
  <>
    <SEO
      title="Privacy Policy"
      description="How Cresciva handles account, business-profile, funding-intelligence, payment and service data."
      noindex
    />

    <section className="bg-navy px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <PageHeader onDark title="Privacy Policy" subtitle={`Last updated: ${LAST_UPDATED}`} />
      </div>
    </section>

    <section className="bg-background px-6 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div role="note" className="mb-10 rounded-xl border border-border bg-surface-subtle p-5 text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-ink-strong">Please note:</strong> This policy describes Cresciva's current product behaviour in good faith. It should be reviewed by qualified counsel for applicable jurisdictions before final public launch.
        </div>

        <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-ink-strong prose-h2:text-2xl prose-h2:font-bold prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary-dark prose-strong:text-ink-strong dark:prose-invert">
          <p>
            Cresciva operates a public Pan-African business directory and a subscription funding-intelligence service. This policy explains how personal and business data is collected, used, shared and retained.
          </p>

          <h2>1. Information we collect</h2>
          <ul>
            <li><strong>Account and authentication data</strong> — account identifiers, email address, authentication/session information and security settings.</li>
            <li><strong>Business profile data</strong> — business/founder name, country, sector, descriptions, links, images and other information you choose to add.</li>
            <li><strong>Contact visibility choices</strong> — phone, email and WhatsApp details may be collected for your profile, but their public availability depends on the supported visibility/reveal settings rather than being treated as universally public.</li>
            <li><strong>Funding intelligence data</strong> — funding preferences, business-enrichment confirmations, searches, saved opportunities, member opportunity states and notification preferences.</li>
            <li><strong>Payment and membership data</strong> — payment references, amount/currency, settlement status, membership state and operational reconciliation records. Full payment credentials are handled by Bachs and are not stored by Cresciva.</li>
            <li><strong>Communications and marketing data</strong> — contact-form messages, resource requests, newsletter state and email delivery/unsubscribe events.</li>
            <li><strong>Operational and analytics data</strong> — product events, pseudonymous session identifiers, error/diagnostic information and salted hashes used for public-endpoint abuse prevention. Raw private funding queries are not copied into general product analytics.</li>
          </ul>

          <h2>2. Public and private information</h2>
          <p>
            Published business-directory fields are intentionally visible to directory visitors. Private account, authentication, payment, funding-preference and operational data is not part of the public directory. Contact details are exposed only through the visibility/reveal behaviour implemented by Cresciva.
          </p>

          <h2>3. How we use information</h2>
          <ul>
            <li>operate authentication, profiles, directory search and membership access;</li>
            <li>enrich a business profile using public evidence when a member requests that feature and asks the member to confirm identity where appropriate;</li>
            <li>match businesses to funding opportunities, check eligibility/status evidence and provide funding notifications;</li>
            <li>process and reconcile membership payments and issue receipts;</li>
            <li>respond to support/contact requests and deliver requested resources or opted-in communications;</li>
            <li>protect the Service from abuse and diagnose reliability/security failures;</li>
            <li>measure aggregate product performance and improve the Service;</li>
            <li>meet legal, accounting and contractual obligations.</li>
          </ul>

          <h2>4. Service providers</h2>
          <p>Cresciva uses service providers to operate the product. Launch providers may include:</p>
          <ul>
            <li><strong>Supabase</strong> for database, authentication, storage and Edge Functions;</li>
            <li><strong>Vercel</strong> for web/application hosting and deployment;</li>
            <li><strong>Bachs</strong> for payment checkout and settlement;</li>
            <li><strong>Resend</strong> for transactional email when enabled;</li>
            <li>AI/search/infrastructure providers used by Business Enrichment and AI-assisted funding discovery;</li>
            <li>monitoring/analytics providers that Cresciva enables for production operations.</li>
          </ul>
          <p>Cresciva does not sell personal data to advertisers.</p>

          <h2>5. Funding source and public-web processing</h2>
          <p>
            Cresciva may retrieve public organisation and funder webpages to identify organisations, verify funding sources or determine whether a programme appears open, upcoming, rolling or closed. AI may help extract facts from retrieved evidence, but source verification/status decisions are controlled separately and are not based solely on AI memory.
          </p>

          <h2>6. Retention</h2>
          <p>
            Account/profile/member data is kept while needed to provide the Service and is deleted or anonymised when a valid deletion request completes, subject to required retention. Cresciva may retain a minimal detached payment/accounting ledger after account deletion, while removing the account link and raw provider payloads. Unsubscribe/suppression information may be retained where necessary to honour communication choices or legal obligations.
          </p>

          <h2>7. Your rights and controls</h2>
          <p>
            Subject to applicable law, you may request access, correction, export or deletion of your personal data and may object to or restrict certain processing. Account settings provide a portable data export and account-deletion workflow. You can edit profile information and communication preferences through the product.
          </p>

          <h2>8. Account deletion</h2>
          <p>
            Account deletion is completed server-side after deliberate confirmation and recent authentication. Cresciva removes account/profile/member records and owned profile media, sanitises directly identifying operational records, and detaches the minimum payment ledger that must be retained for reconciliation or accounting purposes.
          </p>

          <h2>9. Security</h2>
          <p>
            Cresciva uses authentication, row-level security, restricted service roles, server-side privileged operations, source-validation controls and access logging/monitoring practices designed to protect data. No internet service can guarantee absolute security.
          </p>

          <h2>10. International processing</h2>
          <p>
            Cresciva serves users across Africa and uses infrastructure providers that may process information in other countries. Where applicable, Cresciva takes reasonable measures required for lawful international processing and transfer.
          </p>

          <h2>11. Children's privacy</h2>
          <p>The Service is intended for founders, organisations and business users and is not directed to children under 18.</p>

          <h2>12. Changes</h2>
          <p>Material updates will be reflected by changing the date above and providing additional notice where appropriate.</p>

          <h2>13. Contact and data-rights requests</h2>
          <p>
            Privacy questions and data-rights requests can be submitted through the monitored <Link to="/contact">Cresciva contact page</Link>. Signed-in members can also use the export/delete controls in Account settings.
          </p>
        </div>
      </div>
    </section>
  </>
);

export default Privacy;
