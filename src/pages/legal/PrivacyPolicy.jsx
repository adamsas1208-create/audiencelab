import LegalLayout from './LegalLayout'

const UPDATED = 'July 14, 2026'

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <h2>1. Who this policy covers</h2>
      <p>
        This policy explains what data AudienceLab collects, why, and how
        it's handled — both for creators who sign up (accounts) and for
        anonymous visitors who vote on a poll or submit their details
        through a creator's public page.
      </p>

      <h2>2. Data we collect at signup</h2>
      <ul>
        <li><strong>Email + password</strong>, if you sign up directly (password is never stored in plain text — it's handled entirely by our authentication provider, Supabase).</li>
        <li><strong>Name, email, and profile photo</strong>, if you sign up with Google — only what Google's sign-in flow shares with us.</li>
      </ul>

      <h2>3. Data creators collect about their own audience</h2>
      <p>
        If you're a creator, you may add contacts manually or receive them
        automatically when a visitor submits the lead-capture form on your
        public Creator Page. That data (name, email, platform, any
        engagement notes you add) belongs to your audience relationship and
        is stored so you can view and manage it — it is not shared with
        other creators or sold to third parties.
      </p>

      <h2>4. Data from anonymous visitors</h2>
      <p>
        If you vote on a public poll without an account, we assign your
        browser a random identifier stored in your browser's local storage
        (not a cookie, and not tied to your name or email) so the same
        poll can't be voted on twice from the same browser. This identifier
        is not personally identifying on its own. If you submit your name
        and email through a creator's lead-capture form, that information
        is stored as described in Section 3, associated with that creator's
        account.
      </p>

      <h2>5. Cookies and local storage</h2>
      <ul>
        <li>An authentication session token (if you're signed in), managed by Supabase.</li>
        <li>A random per-browser voter identifier (see Section 4), used only for duplicate-vote prevention.</li>
        <li>If you're using the Service without an account configured (demo mode), some data is cached locally in your browser only and never leaves your device.</li>
      </ul>

      <h2>6. Third-party processors</h2>
      <ul>
        <li><strong>Supabase</strong> — hosts our database, authentication, and file storage.</li>
        <li><strong>Google</strong> — only if you choose to sign in with Google.</li>
        <li><strong>Vercel</strong> — hosts the application itself.</li>
        <li><strong>Sentry</strong> — if enabled, receives technical crash/error reports (stack traces, browser info) to help us fix bugs. It does not receive your contacts or poll data.</li>
      </ul>
      <p>
        We do not sell your data or your audience's data to any third party.
      </p>

      <h2>7. Data retention and deletion</h2>
      <p>
        We retain your account and audience data for as long as your
        account is active. There is currently no self-serve "delete my
        account" button in the app — to delete your account and associated
        data, contact us at the email below and we'll process the request
        manually.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        export, or delete your personal data. Contact us at the email below
        to exercise any of these rights.
      </p>

      <h2>9. Children's privacy</h2>
      <p>
        The Service is not directed at children under 13 (or the equivalent
        minimum age in your jurisdiction), and we do not knowingly collect
        data from them.
      </p>

      <h2>10. International data transfer</h2>
      <p>
        Your data may be processed in a country other than your own by our
        infrastructure providers (Supabase, Vercel). By using the Service,
        you consent to this transfer.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy from time to time; the "Last updated" date
        above reflects the most recent revision. Material changes will be
        communicated through the app where practical.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about this policy, or requests to access/delete your data,
        can be sent to{' '}
        <a href="mailto:adamsas1208@gmail.com">adamsas1208@gmail.com</a>.
      </p>

      <h2>A note on this document</h2>
      <p>
        This policy was drafted to accurately describe what AudienceLab
        actually does today, based on the app's real code — not a generic
        template. It is not a substitute for advice from a qualified
        lawyer; before a public launch, have it reviewed for your specific
        jurisdiction (e.g. GDPR if you'll have EU users, or CCPA for
        California residents).
      </p>
    </LegalLayout>
  )
}
