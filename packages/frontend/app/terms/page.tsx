import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, {
  LEGAL_SITE_URL,
  LegalContactLink,
  OurAppsList,
} from '@/components/LegalPage'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://demitaylornimmo.com').replace(/\/$/, '')
const termsTitle = 'Terms of Use'
const termsDescription =
  'Terms of Use for this website and for mobile apps published by Demi Taylor Nimmo, including Marbl.'
const termsUrl = `${siteUrl}/terms`

export const metadata: Metadata = {
  title: termsTitle,
  description: termsDescription,
  openGraph: {
    title: `${termsTitle} | Demi Taylor Nimmo`,
    description: termsDescription,
    url: termsUrl,
    siteName: 'Demi Taylor Nimmo',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${termsTitle} | Demi Taylor Nimmo`,
    description: termsDescription,
  },
  alternates: {
    canonical: termsUrl,
  },
}

export default function TermsOfUsePage() {
  return (
    <LegalPage title="📜 Terms of Use" otherHref="/privacy" otherLabel="Privacy Policy">
      <p>
        These terms apply to this website and to mobile apps we publish,
        including Marbl and any other apps we list below.
      </p>
      <p>
        By using this website, or by downloading or using our apps, you agree to
        these Terms of Use and to our <Link href="/privacy">Privacy Policy</Link>.
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
        These terms are governed by the laws of England and Wales, United
        Kingdom.
      </p>
      <p>
        We may update these documents when we operate under a different brand or
        legal entity. Continued use after we give notice of a change means you
        accept the updated terms.
      </p>
      <p>
        These pages are hosted on this portfolio site and apply until a
        dedicated Mosaic (or other) site replaces them. The URLs are intended to
        stay stable.
      </p>

      <h2>This website</h2>
      <p>
        This site is a public portfolio at{' '}
        <a href={LEGAL_SITE_URL}>{LEGAL_SITE_URL.replace('https://', '')}</a>.
        You may browse the pages we publish, follow links we include, email us,
        or download a CV if one is shown. There is no visitor account, comments
        board, or checkout.
      </p>
      <p>
        The writing, images, project write-ups, and design on this site are
        ours unless we say otherwise. You may view them for your own
        information. You may not copy them for commercial use, scrape the site
        in a way that harms it, or try to reach private or admin areas.
      </p>
      <p>
        Content on this site is a portfolio of work. It is not an offer of
        employment, a professional advice service, or a contract to hire us
        unless we agree that separately by email.
      </p>
      <p>
        Links to other sites (for example GitHub or LinkedIn) are those
        operators’ services. Their terms and privacy rules apply when you leave
        this site.
      </p>
      <p>
        How we handle visit data is in the{' '}
        <Link href="/privacy">Privacy Policy</Link>, including a control to
        turn site analytics off in your browser.
      </p>

      <h2>Our apps</h2>
      <OurAppsList />

      <h2>Licence</h2>
      <p>
        The apps are proprietary. We grant you a personal, non-transferable,
        non-exclusive licence to download and use them for your own use. You do
        not own the software, branding, or other intellectual property in the
        apps (including any content libraries we supply). You may not
        redistribute the apps except as the relevant store allows.
      </p>
      <p>Features may change as we update the apps.</p>

      <h2>Your content</h2>
      <p>
        In the apps, you own the profiles, logs, photos, and other content you
        enter. You are responsible for its accuracy and for any backup you
        export or import. This website does not have user accounts or visitor
        posts.
      </p>

      <h2>Pet-care apps</h2>
      <p>
        Our pet-care apps (including Marbl) are care-logging and training
        helpers. They do not diagnose, calculate doses, or recommend treatment.
        They are not veterinary or medical advice. If your pet is unwell or you
        have an emergency, contact a veterinarian. This section applies only to
        our pet-care apps, not to every app we may publish.
      </p>

      <h2>In-app purchases and refunds</h2>
      <p>
        If an app offers in-app purchases, those are processed by Apple or
        Google. We do not process payments or refunds. Refund requests follow
        the relevant store’s rules.
      </p>

      <h2>Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>misuse the apps or this website</li>
        <li>reverse engineer the apps beyond what applicable law allows</li>
        <li>use the apps or this website for illegal purposes</li>
      </ul>

      <h2>Disclaimer</h2>
      <p>
        The apps and this website are provided “as is”. We do not warrant that
        logs or reminders are complete, or that in-app guidance is suitable for
        every situation or, where relevant, every pet. We do not warrant that
        this website will always be available or error-free.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by the laws of England and Wales, our
        liability arising from your use of the apps or this website is limited.
        Nothing in these terms excludes or limits liability that cannot be
        excluded under UK law, including for death or personal injury caused by
        negligence, or for fraud.
      </p>

      <h2>Termination</h2>
      <p>
        You can stop using an app and uninstall it at any time. Paid
        entitlements follow the rules of the store account you used to purchase
        them.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may change these terms from time to time. The effective date at the
        top will be updated when we do.
      </p>
      <p>
        Questions: <LegalContactLink />.
      </p>

      <h2>Marbl</h2>
      <p>
        Marbl is a local cat-care logging and training helper. It is not a
        veterinary service. Logs and reminders are only as complete as what you
        enter.
      </p>
      <p>
        Marbl Pro is a one-time in-app purchase that unlocks features listed in
        the app (including backup export/import and extra training tools). There
        is no subscription in version 1. Restore purchases using the same Apple
        or Google account you used to buy. Refunds follow Apple and Google
        rules. Pro status is not included in exported backups.
      </p>
    </LegalPage>
  )
}
