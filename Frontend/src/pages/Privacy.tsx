import { Link } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";

const LAST_UPDATED = "20 July 2026";

const Privacy = () => {
  return (
    <>
      <SEO
        title="Privacy Policy"
        description="How Cresciva collects, uses, and protects the personal data of founders using the directory and Funding Radar."
        noindex
      />

      {/* Hero band */}
      <section className="bg-navy px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <PageHeader
            onDark
            title="Privacy Policy"
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
            <strong className="font-semibold text-ink-strong">Please note:</strong> This policy is
            a good-faith template provided for transparency. It is not legal advice and must be
            reviewed and adapted by qualified legal counsel before you rely on it for your
            jurisdiction.
          </div>

          <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-ink-strong prose-h2:text-2xl prose-h2:font-bold prose-h3:text-lg prose-h3:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary-dark prose-strong:text-ink-strong dark:prose-invert">
            <p>
              Cresciva ("we", "us", or "our") operates a public
              pan-African SME directory and a subscription-based funding-intelligence service (the
              "Service"). This Privacy Policy explains what personal data we collect, how we use
              and share it, and the choices and rights you have. It applies to founders, visitors,
              and subscribers across the countries in which we operate.
            </p>

            <h2>1. Information we collect</h2>
            <p>We collect the following categories of information:</p>
            <ul>
              <li>
                <strong>Account information</strong> — your name, email address, and authentication
                details when you create an account or sign in (including via a third-party
                provider such as Google).
              </li>
              <li>
                <strong>Business profile information</strong> — the details you choose to publish
                in the directory, such as business name, founder name, country, sector,
                descriptions, contact details, links, and images. This information is intentionally
                public.
              </li>
              <li>
                <strong>Subscription and payment information</strong> — records of your
                subscription status and history. Card and payment details are handled by our
                payment processor; we do not store full card numbers.
              </li>
              <li>
                <strong>Communications</strong> — the content of messages you send us (for
                example, through the contact form), and any lead or enquiry details you provide.
              </li>
              <li>
                <strong>Usage and device data</strong> — anonymous or pseudonymous analytics such
                as pages viewed, searches run, approximate session identifiers, device and browser
                type, and similar technical information.
              </li>
            </ul>

            <h2>2. How we use your information</h2>
            <p>We use personal data to:</p>
            <ul>
              <li>Provide, operate, and maintain the directory and Funding Radar.</li>
              <li>Publish the business profile you choose to make public.</li>
              <li>
                Curate and deliver funding intelligence relevant to your business (this information
                is guidance only — see our{" "}
                <Link to="/terms">Terms of Service</Link>).
              </li>
              <li>Process subscriptions, confirm access, and provide customer support.</li>
              <li>Respond to your enquiries and communicate service updates.</li>
              <li>
                Understand and improve how the Service is used, and keep it secure and reliable.
              </li>
              <li>Comply with legal obligations and enforce our terms.</li>
            </ul>

            <h2>3. Cookies and analytics</h2>
            <p>
              We use a small number of cookies and similar technologies to keep you signed in,
              remember preferences, and understand aggregate usage. Analytics events are collected
              to measure engagement and improve the Service; wherever possible these are grouped by
              an anonymous session identifier rather than tied to your identity. You can control
              cookies through your browser settings, though disabling them may affect some
              functionality.
            </p>

            <h2>4. How we share information</h2>
            <p>
              We do not sell your personal data. Your public business profile is, by design,
              visible to anyone using the directory. Beyond that, we share personal data only with
              service providers who help us run the Service, under appropriate confidentiality and
              data-protection obligations, including:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — our hosting, database, authentication, and storage
                provider.
              </li>
              <li>
                <strong>Paystack</strong> — our payment processor for subscriptions.
              </li>
              <li>
                AI and infrastructure providers used to generate curated funding intelligence.
              </li>
            </ul>
            <p>
              We may also disclose information where required by law, to protect our rights and the
              safety of our users, or in connection with a business transfer such as a merger or
              acquisition.
            </p>

            <h2>5. International data transfers</h2>
            <p>
              We operate across the African continent and use service providers that may store or
              process data outside your country of residence. Where we transfer personal data
              across borders, we take reasonable steps to ensure it remains protected in line with
              this policy and applicable law.
            </p>

            <h2>6. Data retention</h2>
            <p>
              We retain personal data for as long as your account is active and as needed to
              provide the Service, meet legal and accounting obligations, resolve disputes, and
              enforce our agreements. When data is no longer required, we take steps to delete or
              anonymise it. You may request deletion of your account at any time.
            </p>

            <h2>7. Your rights and choices</h2>
            <p>
              Subject to applicable law, you have the right to access, correct, update, or delete
              your personal data, to object to or restrict certain processing, and to request a
              copy of the data you have provided. You can edit or remove your public profile
              directly from your account, and you can unsubscribe from non-essential
              communications at any time. To exercise any of these rights, contact us using the
              details below.
            </p>

            <h2>8. Security</h2>
            <p>
              We use reasonable technical and organisational measures — including access controls
              and row-level security on our database — to protect personal data. No method of
              transmission or storage is completely secure, however, and we cannot guarantee
              absolute security.
            </p>

            <h2>9. Children's privacy</h2>
            <p>
              The Service is intended for founders and business users and is not directed at
              children. We do not knowingly collect personal data from anyone under the age of 18.
            </p>

            <h2>10. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will revise the
              "Last updated" date above and, where appropriate, provide additional notice. Your
              continued use of the Service after changes take effect constitutes acceptance of the
              updated policy.
            </p>

            <h2>11. Contact us</h2>
            <p>
              If you have questions about this policy or how we handle your data, please reach out
              through our <Link to="/contact">contact page</Link> or email{" "}
              <a href="mailto:privacy@cresciva.com">privacy@cresciva.com</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Privacy;
