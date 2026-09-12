import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, {
  LEGAL_SITE_URL,
  LegalContactLink,
  OurAppsList,
} from '@/components/LegalPage'
import WebsiteAnalyticsChoice from '@/components/WebsiteAnalyticsChoice'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com').replace(/\/$/, '')
const privacyTitle = 'Privacy Policy'
const privacyDescription =
  'Privacy Policy for mobile apps published by Demi Taylor Nimmo, including Marbl, and for this website.'
const privacyUrl = `${siteUrl}/privacy`

export const metadata: Metadata = {
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

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="🔒 Privacy Policy" otherHref="/terms" otherLabel="Terms of Use">
      <p>
        These policies apply to this website and to mobile apps we publish,
        including Marbl and any other apps we list below.
      </p>

      <h2>Who we are</h2>
      <p>
        This website and the apps listed below are published by Demi Taylor
        Nimmo (“we”, “us”). I am a solo developer. You can contact me at{' '}
        <LegalContactLink />.
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
        This is a public portfolio. You can browse the pages, follow links, email
        me, or download a CV if one is shown. There is no visitor account,
        contact form, comments, newsletter, or payment on this site.
      </p>

      <h3>What we collect when you visit</h3>
      <p>
        If you have not turned analytics off, the site sends a first-party
        page-visit record to our own API. We store the page path, a session id
        created in your browser for that visit, the referrer, how long you
        stayed (if more than a few seconds), your browser user agent, and an
        anonymized IP address. The browser may also send a page title; we do
        not rely on that field as stored data.
      </p>
      <p>
        We use this only to understand which pages are visited and to keep the
        site working. We do not use it to advertise, to profile you, or to
        track you across our apps.
      </p>
      <p>
        We do not set first-party cookies for analytics. The session id lives
        in memory for that browser tab until you reload. Hosts that serve the
        site (currently Vercel and Supabase for files) may keep standard
        request logs.
      </p>

      <h3>Your choice</h3>
      <p>
        You can object to site analytics here, free of charge. If you turn them
        off, we store that choice on this device so we can honour it, and we
        stop sending new page-visit records from this browser.
      </p>
      <WebsiteAnalyticsChoice />
      <p>
        To ask us to delete visit records we already hold, email{' '}
        <LegalContactLink />.
      </p>

      <h3>If you email us or download a CV</h3>
      <p>
        Email uses your own mail app and goes to <LegalContactLink />. We do
        not run a contact form on this site. A CV download, if offered, is a
        file from our storage; we do not ask you to register to get it.
      </p>

      <h3>Third parties on this site</h3>
      <p>
        Pages may load fonts from Google Fonts. Google may see your IP address
        and browser details when that happens. We do not use Google Analytics
        or advertising SDKs on this site. Outbound links (for example GitHub or
        LinkedIn) are those services’ own pages.
      </p>

      <h3>How long we keep website data</h3>
      <p>
        Page-visit records are kept so we can see use of the site over time,
        then deleted when they are no longer needed for that purpose. Emails
        you send us are kept only as long as needed to reply.
      </p>

      <h3>Your rights and children</h3>
      <p>
        If UK GDPR applies to data we hold about you, you can ask for access,
        correction, or deletion by emailing <LegalContactLink />. You can also
        complain to the Information Commissioner’s Office at{' '}
        <a href="https://ico.org.uk">ico.org.uk</a>.
      </p>
      <p>
        This website is not directed at children under 13.
      </p>

      <h2>Our apps</h2>
      <OurAppsList />

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
        a product section says otherwise. Marbl does not use third-party
        analytics SDKs.
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

      <p>
        Related: <Link href="/terms">Terms of Use</Link>.
      </p>
    </LegalPage>
  )
}
