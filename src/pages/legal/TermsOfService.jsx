import LegalLayout from './LegalLayout'

const UPDATED = 'July 14, 2026'

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" updated={UPDATED}>
      <h2>1. Acceptance of these Terms</h2>
      <p>
        By creating an account or otherwise using AudienceLab ("the Service"),
        you agree to these Terms of Service. If you do not agree, please do
        not use the Service.
      </p>

      <h2>2. What AudienceLab is</h2>
      <p>
        AudienceLab lets creators run voting rooms, collect and manage an
        audience of contacts, publish polls, and maintain a public profile
        page (a "Creator Page") that their audience can visit. Some features
        are usable without an account (e.g. voting on a public poll or
        joining a creator's audience through their Creator Page); creating
        content or managing your own audience requires an account.
      </p>

      <h2>3. Accounts</h2>
      <ul>
        <li>You must provide an accurate email address and keep your login credentials confidential.</li>
        <li>You are responsible for all activity that happens under your account.</li>
        <li>You must be legally able to enter into these Terms in your jurisdiction to create an account.</li>
      </ul>

      <h2>4. Your content and your audience's data</h2>
      <p>
        As a creator, you may upload or collect data about your own audience
        (names, emails, platform, engagement notes) — either manually or
        through the lead-capture form on your public Creator Page. You are
        responsible for:
      </p>
      <ul>
        <li>having a lawful basis to collect and store that data (e.g. the person voluntarily submitted their own information to your page);</li>
        <li>using it in a way that complies with applicable law, including anti-spam and data-protection law in your audience's jurisdiction;</li>
        <li>not uploading data you don't have the right to hold.</li>
      </ul>
      <p>
        AudienceLab acts as the platform that stores this data on your
        behalf; we do not sell or independently market to your audience.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use automated tools to flood a poll with fake votes or submit bulk fake leads through a Creator Page's lead form;</li>
        <li>upload another person's private data without a lawful basis to do so;</li>
        <li>use the Service to send unsolicited bulk messages or spam;</li>
        <li>attempt to circumvent the Service's technical limits (including any account-tier usage limits) or interfere with its normal operation;</li>
        <li>use the Service for any unlawful purpose.</li>
      </ul>
      <p>
        We may suspend or terminate accounts that violate this section.
      </p>

      <h2>6. Free and paid tiers</h2>
      <p>
        AudienceLab may offer a free tier with usage limits (for example, a
        maximum number of contacts or polls) alongside a paid tier that
        removes those limits. Current limits and pricing are shown in the
        app and may change; we'll make reasonable efforts to communicate
        material changes in advance.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using the Service and request account deletion at any
        time by contacting us at the email below. We may suspend or
        terminate your access if you violate these Terms.
      </p>

      <h2>8. Disclaimer of warranties</h2>
      <p>
        The Service is provided "as is" and "as available," without
        warranties of any kind, express or implied, including but not
        limited to fitness for a particular purpose and non-infringement. We
        do not guarantee the Service will be uninterrupted, error-free, or
        secure.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the operator of the Service
        is not liable for any indirect, incidental, special, or
        consequential damages arising from your use of the Service,
        including loss of data, revenue, or business opportunity.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the
        Service after an update constitutes acceptance of the revised Terms.
        The "Last updated" date above reflects the most recent revision.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Israel, without
        regard to conflict-of-law principles. Any dispute arising from these
        Terms will be subject to the exclusive jurisdiction of the competent
        courts of Israel.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms, or requests to delete your account or
        data, can be sent to{' '}
        <a href="mailto:adamsas1208@gmail.com">adamsas1208@gmail.com</a>.
      </p>

      <h2>A note on this document</h2>
      <p>
        This is a general-purpose Terms of Service drafted to reflect what
        AudienceLab actually does today. It is not a substitute for advice
        from a qualified lawyer — before relying on it for a public launch,
        have it reviewed by one, particularly around your specific
        jurisdiction and any regulated data (health, children's data,
        payment information) your creators might collect.
      </p>
    </LegalLayout>
  )
}
