import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, {
  LEGAL_SITE_URL,
  LegalContactLink,
  OurAppsList,
} from '@/components/LegalPage'
import WebsiteAnalyticsChoice from '@/components/WebsiteAnalyticsChoice'
import { fetchPublicFeatureFlag, SHOW_MARBL_FLAG } from '@/lib/featureFlags'

export const dynamic = 'force-dynamic'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com').replace(/\/$/, '')
const privacyTitle = 'Privacy Policy'
const privacyUrl = `${siteUrl}/privacy`

export function privacyMetadataFor(showMarbl: boolean): Metadata {
  const privacyDescription = showMarbl
    ? 'Privacy Policy for this website and for mobile apps published by Demi Taylor Nimmo, including Marbl.'
    : 'Privacy Policy for this website, published by Demi Taylor Nimmo.'
  return {
    title: privacyTitle,
    description: privacyDescription,
    openGraph: {
      title: `${privacyTitle} | Demi Taylor Nimmo`,
      description: privacyDescription,
      url: privacyUrl,
      siteName: 'Demi Taylor Nimmo',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${privacyTitle} | Demi Taylor Nimmo`,
      description: privacyDescription,
    },
    alternates: {
      canonical: privacyUrl,
    },
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return privacyMetadataFor(await fetchPublicFeatureFlag(SHOW_MARBL_FLAG))
}

export function PrivacyPolicyContent({ showMarbl }: { showMarbl: boolean }) {
  return (
    <LegalPage title="Privacy Policy" otherHref="/terms" otherLabel="Terms of Use">
      <p>
        {showMarbl
          ? 'These policies apply to this website and to mobile apps we publish, including Marbl and any other apps we list below.'
          : 'These policies apply to this website. When we publish a mobile app, we will list it below and say what that app collects.'}
      </p>

      <h2>Who we are</h2>
      <p>
        {showMarbl
          ? 'This website and the apps listed below are published by Demi Taylor Nimmo (“we”, “us”).'
          : 'This website is published by Demi Taylor Nimmo (“we”, “us”).'}{' '}
        I am a solo developer. You can contact me at <LegalContactLink />.
      </p>
      <p>
        This website is <a href={LEGAL_SITE_URL}>{LEGAL_SITE_URL.replace('https://', '')}</a>.
      </p>
      <p>
        We may update these documents when we operate under a different brand or
        legal entity. Continued use after we give notice of a change means you
        accept the updated policy.
      </p>

      <h2>This website</h2>
      <p>
        This is a public portfolio. You can browse the pages, follow links, send
        me a message through the Hire me form, email me, or download my CV.
        There is no visitor account, comments, newsletter, or payment on this site.
      </p>

      <h3>What we collect when you visit</h3>
      <p>
        Nothing, unless you allow analytics. The first time you visit, a banner
        asks whether I may count your visit. Until you choose “Allow
        analytics”, no page-visit record is sent and no visit ID is created.
        If your browser sends Global Privacy Control or Do Not Track, analytics
        stays off unless you turn it on yourself.
      </p>
      <p>If you allow analytics, each page you view sends a record to my own API with:</p>
      <ul>
        <li>the page you viewed and its title</li>
        <li>how long you stayed on it (when it is more than a few seconds)</li>
        <li>the site you came from (the referrer), if your browser shares it</li>
        <li>your browser type (the user agent)</li>
        <li>a shortened IP address, cut down so it does not identify you</li>
        <li>a random visit ID, kept in your browser and replaced after 30 minutes without a page view</li>
      </ul>
      <p>
        I use this only to see which pages are useful, so I can improve the
        site. I do not use it to advertise, to profile you
        {showMarbl ? ', or to track you across our apps' : ''}, and I do not
        sell or share it. No third-party analytics or tracking tools are used:
        the records go to my own database and nowhere else.
      </p>

      <h3>Your choice</h3>
      <p>
        Analytics is opt-in, and you can change your mind at any time, free of
        charge, from “Cookie settings” at the bottom of every page. Turning
        analytics off stops new records straight away and deletes the visit ID
        from your browser. Your choice itself is stored in your browser
        (localStorage) so you are not asked again; it is never sent to me.
      </p>
      <p>
        “Preferences” is a separate, optional choice. If you allow it, your
        browser remembers small things such as the home page colour theme. If
        you don’t, nothing is stored and those choices last only for your visit.
      </p>
      <WebsiteAnalyticsChoice />

      <h3>Cookies and similar storage</h3>
      <p>
        This site sets no cookies. It uses your browser’s own storage
        (localStorage, which lasts until it is cleared) for the items below,
        and only these.
      </p>
      <div className="legal-table-wrap">
        <table className="legal-table">
          <caption>What this site stores in your browser</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col">Purpose</th>
              <th scope="col">How long it lasts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row"><code>portfolio_consent</code> (localStorage)</th>
              <td>Essential</td>
              <td>Remembers your cookie settings choice so you are not asked again.</td>
              <td>Until you change it or clear your browser.</td>
            </tr>
            <tr>
              <th scope="row"><code>portfolio_visit_id</code> (localStorage)</th>
              <td>Analytics</td>
              <td>A random visit ID and the time of your last page view, so the pages you view in one visit are counted together. Only created if you allow analytics.</td>
              <td>Replaced with a new ID after 30 minutes without a page view; deleted straight away if you turn analytics off.</td>
            </tr>
            <tr>
              <th scope="row"><code>portfolio_exclude_me</code> (localStorage)</th>
              <td>Essential</td>
              <td>Set only if you open a link with <code>?exclude_me=1</code> (meant for me, the site owner): this browser is then never counted. <code>?exclude_me=0</code> removes it.</td>
              <td>Until removed that way or you clear your browser.</td>
            </tr>
            <tr>
              <th scope="row"><code>home_colourway</code> (localStorage)</th>
              <td>Preferences</td>
              <td>Remembers the colour theme you picked on the home page. Only stored if you allow preferences.</td>
              <td>Until you change it, turn preferences off, or clear your browser.</td>
            </tr>
            <tr>
              <th scope="row"><code>post_sparkle:</code> plus the post’s address (localStorage)</th>
              <td>Preferences</td>
              <td>Remembers that you sent a sparkle on a blog post. Only stored if you allow preferences.</td>
              <td>Until you undo it, turn preferences off, or clear your browser.</td>
            </tr>
            <tr>
              <th scope="row"><code>portfolio_analytics_opt_out</code> (localStorage)</th>
              <td>Essential</td>
              <td>An older setting from before this banner. If your browser still has it, it is read once to carry over an “analytics off” choice.</td>
              <td>Deleted on your next visit.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        To ask me to delete visit records I already hold, email{' '}
        <LegalContactLink />.
      </p>

      <h3>If you message me, email me or download my CV</h3>
      <p>
        If you send a message through the Hire me form, I store what you enter
        (the reason, your name if you give it, your email address and your
        message) and the page you sent it from, so I can reply. A copy is
        emailed to me through Resend, an email delivery service that sends it
        on my behalf. Email you send directly goes to <LegalContactLink /> from
        your own mail app. The CV download is a file from my storage; you do
        not need to register to get it.
      </p>

      <h3>Third parties on this site</h3>
      <p>
        Fonts are served from this site, not from Google. I do not use Google
        Analytics, advertising SDKs or any other third-party trackers. Hosts
        that serve the site and its files (currently Vercel and Supabase) may
        keep standard request logs. Outbound links (for example GitHub or
        LinkedIn) are those services’ own pages.
      </p>

      <h3>How long we keep website data</h3>
      <p>
        Page-visit records are kept for 12 months and then deleted. Messages
        from the Hire me form and emails you send are kept only as long as
        needed to reply and follow up.
      </p>

      <h3>Who processes data for me</h3>
      <p>I use these services to run the site. Each one handles data only to provide its service to me:</p>
      <ul>
        <li>
          <strong>Supabase</strong> (database and file storage): stores analytics
          records if you allow them, Hire me messages, the site’s content, and
          files such as images and the CV.
        </li>
        <li>
          <strong>Vercel</strong> (hosting and serverless functions): serves the
          website and runs the API that receives page-visit records and Hire me
          messages. Like any host, it may keep standard request logs.
        </li>
        <li>
          <strong>Resend</strong> (email delivery): sends me a copy of each Hire
          me message by email, once that is switched on. It receives the
          message and the details you entered in the form.
        </li>
      </ul>
      <p>
        These providers may process data outside the UK. Where they do, they
        rely on the safeguards UK data protection law allows for international
        transfers, as set out in their own terms.
      </p>

      <h3>Your rights and children</h3>
      <p>If UK GDPR applies to data I hold about you, you have the right to:</p>
      <ul>
        <li>ask for a copy of it (access)</li>
        <li>ask me to correct it (correction)</li>
        <li>ask me to delete it (deletion)</li>
        <li>object to how I use it, including analytics (objection)</li>
        <li>
          complain to the Information Commissioner’s Office at{' '}
          <a href="https://ico.org.uk">ico.org.uk</a>
        </li>
      </ul>
      <p>
        To use any of these rights, or to ask a question about your data, email
        me at <LegalContactLink />. You can turn analytics off yourself at any
        time from “Cookie settings”.
      </p>
      <p>
        This website is not directed at children under 13.
      </p>

      {showMarbl && (
      <>
      <h2>Our apps</h2>
      <OurAppsList showMarbl={showMarbl} />

      <h2>What the apps collect</h2>
      <p>
        For the apps, we only collect the categories described for each product
        below, and only with your permission. Collection can differ by product —
        for example, one app may use an optional sensor or a store purchase,
        while another may not. Do not assume a rule for one app applies to
        every app we publish. Website visits are described above, not in this
        section.
      </p>

      <h2>Shared rules for every app</h2>

      <h3>No sale of data, ads, or cross-app tracking</h3>
      <p>
        We do not sell personal data. We do not show ads in the apps listed
        below. We do not track you across our apps.
      </p>
      <p>
        We do not use third-party analytics SDKs in the apps listed below unless
        a product section says otherwise.
      </p>

      <h3>Store purchases</h3>
      <p>
        If an app offers in-app purchases, those go through the Apple App Store
        or Google Play. Payment details are handled by the store, not by us. We
        may receive purchase tokens or restore status through StoreKit or Play
        Billing so we can unlock what you bought.
      </p>

      <h3>Third parties</h3>
      <p>
        Apps may use the operating system for photos, location, and
        notifications, and Apple or Google for store purchases. We do not sell
        that data and we do not pass app content to advertising or analytics
        companies unless a product section says otherwise.
      </p>

      <h3>How to delete data</h3>
      <p>
        How deletion works depends on where that app stores data. See each app
        below.
      </p>
      <p>
        For on-device apps, data lives on your device until you delete it in the
        app or uninstall the app. If an app lets you export a backup, that
        exported file is yours to keep or delete — we do not host it, and you
        are responsible for it.
      </p>
      <p>
        Your device or store account may also make its own backups (for example
        iCloud Backup or Android Auto Backup). Those copies are controlled by
        you and the platform, not by us.
      </p>

      <h3>Children</h3>
      <p>
        Our apps are not directed at children under 13. Parents or guardians
        should manage the device and decide whether a child may use an app.
      </p>

      <h3>Changes and contact</h3>
      <p>
        We may change this Privacy Policy from time to time. The effective date
        at the top will be updated when we do. These pages are hosted on this
        portfolio site and apply until a dedicated Mosaic (or other) site
        replaces them. The URLs are intended to stay stable.
      </p>
      <p>
        Questions: <LegalContactLink />.
      </p>

      <h2>What each app collects</h2>
      <p>
        The table below describes Marbl, the only app we publish today. When we
        publish another app, we will add it to “Our apps” and give it its own
        column, row, or subsection.
      </p>

      <h3>Marbl</h3>
      <p>
        Marbl is a local cat-care logging and training helper. Profiles, care
        and health logs (including weight, treatments, and vet-visit notes you
        type in), reminders, training progress, photos, adventure routes, and
        any backups you export are user content stored on your device. We do
        not host them, and we do not process them in the cloud as health data.
      </p>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-left text-sm border-collapse">
          <caption className="text-left font-semibold text-gray-800 mb-3 text-base">
            Marbl data collection
          </caption>
          <thead>
            <tr className="border-b border-pink-200">
              <th scope="col" className="py-3 pr-4 font-semibold text-gray-900 align-top w-40">
                Topic
              </th>
              <th scope="col" className="py-3 font-semibold text-gray-900 align-top">
                Marbl
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            <tr className="border-b border-pink-100">
              <th scope="row" className="py-3 pr-4 font-semibold text-gray-900 align-top">
                Account
              </th>
              <td className="py-3 align-top">
                None — no sign-up; we do not run a user database for the app
              </td>
            </tr>
            <tr className="border-b border-pink-100">
              <th scope="row" className="py-3 pr-4 font-semibold text-gray-900 align-top">
                Where data lives
              </th>
              <td className="py-3 align-top">
                On device (SwiftData / Room). We do not host cat profiles,
                care/health logs, reminders, training progress, routes, or
                backups you export. The operating system may copy app data to
                your own iCloud or Android backup if you have that turned on.
              </td>
            </tr>
            <tr className="border-b border-pink-100">
              <th scope="row" className="py-3 pr-4 font-semibold text-gray-900 align-top">
                Optional sensors
              </th>
              <td className="py-3 align-top">
                Photos via the system library picker only (no camera
                permission); stored on device. Location only while an Adventure
                outing is active, when-in-use, not in the background; GPS
                points stay on device and are not sent to us. On Android,
                location fixes may come through Google Play services on the
                device.
              </td>
            </tr>
            <tr className="border-b border-pink-100">
              <th scope="row" className="py-3 pr-4 font-semibold text-gray-900 align-top">
                Notifications
              </th>
              <td className="py-3 align-top">
                Optional local reminders (not marketing push from a server)
              </td>
            </tr>
            <tr className="border-b border-pink-100">
              <th scope="row" className="py-3 pr-4 font-semibold text-gray-900 align-top">
                Analytics / ads
              </th>
              <td className="py-3 align-top">None</td>
            </tr>
            <tr className="border-b border-pink-100">
              <th scope="row" className="py-3 pr-4 font-semibold text-gray-900 align-top">
                Purchases
              </th>
              <td className="py-3 align-top">
                Marbl Pro is a one-time in-app purchase via Apple or Google.
                We store a local unlock flag. Payment details stay with the
                store.
              </td>
            </tr>
            <tr>
              <th scope="row" className="py-3 pr-4 font-semibold text-gray-900 align-top">
                Third parties
              </th>
              <td className="py-3 align-top">
                Apple / Google for purchases; the OS for photos, location, and
                local notifications. No ads, analytics, or crash SDKs.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </>
      )}

      <p>
        Related: <Link href="/terms">Terms of Use</Link>.
      </p>
    </LegalPage>
  )
}

export default async function PrivacyPolicyPage() {
  const showMarbl = await fetchPublicFeatureFlag(SHOW_MARBL_FLAG)
  return <PrivacyPolicyContent showMarbl={showMarbl} />
}
