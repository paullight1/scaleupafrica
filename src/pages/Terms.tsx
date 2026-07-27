import { Link } from "react-router-dom";
import { SEO } from "@/components/common/SEO";
import { PageHeader } from "@/components/common/PageHeader";

const LAST_UPDATED = "20 July 2026";

const Terms = () => {
  return (
    <>
      <SEO
        title="Terms of Service"
        description="The terms governing your use of the Cresciva directory and Funding Radar, including subscriptions, acceptable use, and disclaimers."
        noindex
      />

      {/* Hero band */}
      <section className="bg-navy px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <PageHeader
            onDark
            title="Terms of Service"
            subtitle={`Last updated: ${LAST_UPDATED}`}
          />
        </div>
      </section>

      <section className="bg-background px-6 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          {/* Template notice */}
          <div
            role="note"
            className="mb-10 rounded-xl border border-border bg-surface-subtle p-5 text-sm leading-relaxed text-muted-foreground"
          >
            <strong className="font-semibold text-ink-strong">Please note:</strong> These terms are
            a good-faith template provided for transparency. They are not legal advice and must be
            reviewed and adapted by qualified legal counsel before you rely on them for your
            jurisdiction.
          </div>

          <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-ink-strong prose-h2:text-2xl prose-h2:font-bold prose-h3:text-lg prose-h3:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary-dark prose-strong:text-ink-strong dark:prose-invert">
            <p>
              These Terms of Service ("Terms") govern your access to and use of the Cresciva
              directory and funding-intelligence services (the "Service"), operated by Cresciva
              ("we", "us", or "our"). Please read them carefully. By using the Service you
              agree to these Terms.
            </p>

            <h2>1. Acceptance of terms</h2>
            <p>
              By creating an account, publishing a profile, subscribing, or otherwise using the
              Service, you confirm that you have read, understood, and agree to be bound by these
              Terms and our <Link to="/privacy">Privacy Policy</Link>. If you are using the Service
              on behalf of a business, you represent that you are authorised to bind that business.
              If you do not agree, do not use the Service.
            </p>

            <h2>2. Accounts and profiles</h2>
            <p>
              You are responsible for the accuracy of the information you provide and for keeping
              your login credentials secure. You must not impersonate another person or business or
              misrepresent your affiliation. You are responsible for all activity that occurs under
              your account. Business profiles are public; only publish information you are
              comfortable sharing openly. You may edit or remove your profile at any time.
            </p>

            <h2>3. Subscriptions, payments, and refunds</h2>
            <p>
              The directory is free to use. Access to the Funding Radar and other premium features
              requires a paid subscription. By subscribing, you authorise us and our payment
              processor to charge the applicable fees.
            </p>
            <ul>
              <li>
                <strong>Billing.</strong> Fees, billing frequency, and any renewal terms are shown
                at the point of purchase. Subscriptions may renew automatically unless cancelled
                before the renewal date.
              </li>
              <li>
                <strong>Payments.</strong> Payments are processed by our payment provider,
                Paystack. We do not store full payment-card details.
              </li>
              <li>
                <strong>Refunds.</strong> Except where required by applicable law, subscription
                fees are generally non-refundable once a billing period has begun. If you believe
                you were charged in error, contact us and we will review your case in good faith.
              </li>
              <li>
                <strong>Cancellation.</strong> You may cancel at any time; cancellation stops
                future renewals, and access typically continues until the end of the current paid
                period.
              </li>
            </ul>

            <h2>4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Post false, misleading, unlawful, or infringing content.</li>
              <li>Harvest, scrape, or resell directory data or funding information in bulk.</li>
              <li>
                Attempt to gain unauthorised access to the Service, other accounts, or our systems.
              </li>
              <li>Upload malware or interfere with the Service's operation or security.</li>
              <li>Use the Service to harass, defraud, or harm others.</li>
            </ul>
            <p>
              We may suspend or terminate accounts that violate these Terms or that create risk or
              possible legal exposure for us or other users.
            </p>

            <h2>5. Funding information disclaimer</h2>
            <p>
              The Funding Radar and related content aggregate and summarise third-party funding
              opportunities using automated and AI-assisted methods.{" "}
              <strong>
                This information is provided for general, informational purposes only. It is not
                financial, legal, or professional advice, and we make no guarantee that any
                opportunity is current, accurate, complete, applicable to you, or that any
                application will be successful.
              </strong>{" "}
              Always verify details, eligibility, and deadlines directly with the relevant funder
              before applying or relying on any listing. You are solely responsible for decisions
              you make based on this information.
            </p>

            <h2>6. Intellectual property</h2>
            <p>
              The Service, including its software, design, and branding, is owned by Cresciva
              and protected by applicable laws. You retain ownership of the content you submit, and
              you grant us a licence to host, display, and distribute that content as necessary to
              operate the Service — including publishing your profile in the public directory.
            </p>

            <h2>7. Third-party services and links</h2>
            <p>
              The Service relies on third-party providers (including Supabase and Paystack) and may
              link to external funder websites and resources. We are not responsible for the
              content, policies, or practices of third parties, and your use of them is governed by
              their own terms.
            </p>

            <h2>8. Disclaimer of warranties</h2>
            <p>
              The Service is provided on an "as is" and "as available" basis, without warranties of
              any kind, whether express or implied, including warranties of merchantability,
              fitness for a particular purpose, and non-infringement. We do not warrant that the
              Service will be uninterrupted, error-free, or secure.
            </p>

            <h2>9. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Cresciva and its team will not be
              liable for any indirect, incidental, special, consequential, or punitive damages, or
              for any loss of profits, revenue, data, or opportunities, arising out of or related
              to your use of the Service. To the extent liability cannot be excluded, our total
              liability is limited to the amount you paid us for the Service in the twelve months
              preceding the claim.
            </p>

            <h2>10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Cresciva from claims, damages, and
              expenses arising from your content, your use of the Service, or your breach of these
              Terms.
            </p>

            <h2>11. Termination</h2>
            <p>
              You may stop using the Service at any time. We may suspend or terminate your access if
              you breach these Terms or where necessary to protect the Service or its users. Certain
              provisions — including disclaimers, limitations of liability, and intellectual
              property terms — survive termination.
            </p>

            <h2>12. Governing law</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which Cresciva is
              established, without regard to conflict-of-law principles. The specific governing law
              and venue should be confirmed with legal counsel and stated here before publication.
            </p>

            <h2>13. Changes to these terms</h2>
            <p>
              We may update these Terms from time to time. When we do, we will revise the "Last
              updated" date above and, where appropriate, provide additional notice. Your continued
              use of the Service after changes take effect constitutes acceptance of the updated
              Terms.
            </p>

            <h2>14. Contact us</h2>
            <p>
              Questions about these Terms? Reach us through our{" "}
              <Link to="/contact">contact page</Link> or email{" "}
              <a href="mailto:legal@cresciva.com">legal@cresciva.com</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Terms;
