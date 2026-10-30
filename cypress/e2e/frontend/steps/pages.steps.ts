/// <reference types="cypress" />
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor'
import { accName, bodyText, byName, dataset, mockData, norm } from '../../../support/frontend/site'

const list = (s: string) => s.split(', ')
const text = (el: Element) => norm((el as HTMLElement).innerText ?? el.textContent)

/** The smallest container around a heading, used as "the card/section of X". */
function containerOfHeading(selector: string, name: string, stop = 'section, li, article, figure, div') {
  return cy
    .get(selector)
    .filter((_, el) => text(el) === name)
    .first()
    .then(($h) => cy.wrap($h[0].closest(stop) as HTMLElement))
}

// ---------- Home ----------

Then('the hero shows {string}', (t: string) => {
  cy.get('#top, main section').first().contains(t).should('be.visible')
})

function recentWorkLinks() {
  return cy
    .get('h2')
    .filter((_, el) => /^Recent work$/.test(text(el)))
    .first()
    .then(($h) => {
      const section = $h[0].closest('section') as HTMLElement
      return Array.from(section.querySelectorAll<HTMLAnchorElement>('a[href^="/projects/"]'))
    })
}

function cardTitle(a: HTMLAnchorElement) {
  const h = a.querySelector('h2, h3, h4')
  return h ? text(h) : a.querySelector('img')?.getAttribute('alt') || text(a)
}

Then('Recent work shows the cards {string}', (titles: string) => {
  recentWorkLinks().should((links) => {
    expect(Array.from(links as ArrayLike<HTMLAnchorElement>).map(cardTitle)).to.deep.eq(list(titles))
  })
})

Then('each Recent work card links to its {string} with its title', (_pattern: string) => {
  recentWorkLinks().should(($links) => {
    const links = Array.from($links as ArrayLike<HTMLAnchorElement>)
    expect(links).to.have.length(3)
    links.forEach((a) => {
      const title = cardTitle(a)
      const slug = title.toLowerCase().replace(/\s+/g, '-')
      expect(a.getAttribute('href')).to.eq(`/projects/${slug}`)
      const img = a.querySelector('img')
      if (img) expect(img.getAttribute('alt'), 'image alt = title').to.eq(title)
    })
  })
})

Then('the swatch {string} is pressed', (name: string) => {
  byName(name, 'button').should('have.attr', 'aria-pressed', 'true')
  cy.get('button[aria-pressed="true"]').filter((_, el) => ['Lilac', 'Rose', 'Moonlight'].includes(accName(el))).should('have.length', 1)
})

Then('the CSS variable {string} on body is {string}', (name: string, value: string) => {
  cy.get('body').should(($b) => expect(getComputedStyle($b[0]).getPropertyValue(name).trim().toLowerCase()).to.eq(value))
})

Then('there is an img role whose name contains {string}', (t: string) => {
  cy.get('[role="img"]').filter((_, el) => accName(el).includes(t)).should('have.length.gte', 1)
})

// ---------- Projects ----------

function projectHeadings() {
  return cy
    .get('main')
    .then(($m) => Cypress.$(Array.from($m[0].querySelectorAll<HTMLElement>('h2')).filter((h) => !/project in mind/i.test(text(h)))))
}

Then('the project section headings are {string}', (titles: string) => {
  projectHeadings().should((hs) => expect(Array.from(hs).map(text)).to.deep.eq(list(titles)))
})

Then('the case study buttons link to {string}', (hrefs: string) => {
  projectHeadings().then(($hs) => {
    const hs = Array.from($hs)
    const expected = list(hrefs)
    expect(hs).to.have.length(expected.length)
    hs.forEach((h, i) => {
      const section = h.closest('section') as HTMLElement
      const links = Array.from(section.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'))
      expect(links, `section "${text(h)}" links`).to.include(expected[i])
      const named = Array.from(section.querySelectorAll('a')).filter((a) => /Read the case study/.test(text(a)))
      expect(named.length, `"Read the case study" in "${text(h)}"`).to.be.gte(1)
      named.forEach((a) => expect(a.getAttribute('href')).to.eq(expected[i]))
    })
  })
})

Then('the section {string} lists the features {string}', (title: string, features: string) => {
  containerOfHeading('main h2', title, 'section').then(($s) => {
    const items = Array.from(($s as unknown as JQuery<HTMLElement>)[0].querySelectorAll('li')).map(text)
    expect(items).to.deep.eq(list(features))
  })
})

Then('the section {string} has no feature checklist', (title: string) => {
  containerOfHeading('main h2', title, 'section').then(($s) => {
    expect(($s as unknown as JQuery<HTMLElement>)[0].querySelectorAll('li').length).to.eq(0)
  })
})

Then('the page shows an empty projects message', () => {
  projectHeadings().should((hs) => expect(Array.from(hs)).to.have.length(0))
  bodyText().should('match', /(no projects|on the way|coming soon|nothing here|check back|nothing to show)/i)
})

// ---------- Case study ----------

function tocLinks() {
  return cy.get('nav[aria-label="On this page"] a').then(($a) => Array.from($a).map((a) => a.getAttribute('href') || ''))
}

Then('the {string} links are {string}', (nav: string, hrefs: string) => {
  cy.get(`nav[aria-label="${nav}"] a`).should(($a) => expect(Array.from($a).map((a) => a.getAttribute('href'))).to.deep.eq(list(hrefs)))
})

Then('the {string} links include {string}', (_nav: string, href: string) => {
  tocLinks().should('include', href)
})

Then('the legacy content {string} is not shown', (t: string) => {
  cy.get('body').should(($b) => expect(text($b[0])).not.to.contain(t))
})

function setCaseStudy(slug: string, caseStudy: unknown) {
  dataset().then((d) => {
    const projects = d.projects.map((p: any) => (p.slug === slug ? { ...p, case_study: caseStudy } : p))
    mockData('projects', projects)
  })
}

Given('project {string} has the case study fixture {string}', (slug: string, file: string) => {
  cy.fixture(`frontend/${file}`).then((cs) => setCaseStudy(slug, cs))
})

Given('project {string} has the case study:', (slug: string, json: string) => {
  setCaseStudy(slug, JSON.parse(json))
})

Then('the {string} tablist has {int} tabs', (name: string, n: number) => {
  cy.get(`[role="tablist"][aria-label="${name}"] [role="tab"]`).should('have.length', n)
})

Then('tab {int} is selected', (n: number) => {
  cy.get('[role="tab"]').should(($t) => {
    const selected = Array.from($t).map((t) => t.getAttribute('aria-selected'))
    expect(selected[n - 1], `tab ${n}`).to.eq('true')
    expect(selected.filter((s) => s === 'true')).to.have.length(1)
  })
})

When('the visitor clicks tab {int}', (n: number) => {
  cy.get('[role="tab"]').eq(n - 1).click()
})

Then('the tab panel shows {string}', (t: string) => {
  cy.get('[role="tabpanel"]').should(($p) => expect(text($p[0])).to.contain(t))
})

When('the visitor focuses tab {int} and presses ArrowRight', (n: number) => {
  cy.get('[role="tab"]').eq(n - 1).focus()
  cy.press(Cypress.Keyboard.Keys.RIGHT)
})

Then('tab {int} has focus', (n: number) => {
  cy.get('[role="tab"]').eq(n - 1).should('have.focus')
})

Then('an image with alt {string} is in the tab panel', (alt: string) => {
  cy.get(`[role="tabpanel"] img[alt="${alt}"]`).should('exist')
})

Then('the challenge {string} reads {string} then {string}', (title: string, label: string, solution: string) => {
  cy.get('#challenges h3')
    .filter((_, el) => text(el) === title)
    .should('have.length', 1)
    .then(($h) => {
      const card = $h[0].parentElement as HTMLElement
      expect(text(card)).to.match(new RegExp(`${label}\\s*${solution.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    })
})

Then('the outcome shows the metrics {string}', (pairs: string) => {
  const metrics = list(pairs).map((p) => p.split('|'))
  cy.get('#outcome').should(($o) => {
    const all = Array.from($o[0].querySelectorAll<HTMLElement>('*'))
    const tiles = metrics.map(([value, label]) => {
      const v = all.find((el) => el.children.length === 0 && text(el) === value)
      expect(v, `metric value ${value}`).to.exist
      const tile = (v as HTMLElement).parentElement as HTMLElement
      expect(text(tile), `tile for ${value}`).to.contain(label)
      return tile
    })
    expect(new Set(tiles).size, 'distinct tiles').to.eq(metrics.length)
  })
})

function heroMetaValue(label: string): Cypress.Chainable<string | null> {
  return cy.get('#cs-hero').then(($hero) => {
    const el = Array.from($hero[0].querySelectorAll<HTMLElement>('dt, p, span, div, strong')).find(
      (e) => e.children.length === 0 && text(e) === label
    )
    if (!el) return null
    const sib = el.nextElementSibling
    return sib ? text(sib) : text(el.parentElement as HTMLElement).replace(label, '').trim()
  })
}

Then('the hero meta has no {string} item', (label: string) => {
  heroMetaValue(label).should('eq', null)
})

Then('the hero meta {string} is {string}', (label: string, value: string) => {
  heroMetaValue(label).should('eq', value)
})

Then('the Next project band links to {string}', (href: string) => {
  cy.contains(/Next project/i).should(($el) => {
    const el = $el[0]
    const anchor = (el.closest('a') ||
      (el.closest('section, aside, div') as HTMLElement).querySelector(`a[href="${href}"]`)) as HTMLAnchorElement | null
    expect(anchor, 'Next project link').to.exist
    expect(anchor!.getAttribute('href')).to.eq(href)
  })
})

// ---------- Experience ----------

function roles() {
  return cy.get('main ol > li')
}

function role(position: string) {
  return roles().filter((_, li) => {
    const h = li.querySelector('h3')
    return Boolean(h && text(h) === position)
  })
}

Then('the roles are {string}', (positions: string) => {
  roles().should(($li) => expect(Array.from($li).map((li) => text(li.querySelector('h3') as Element))).to.deep.eq(list(positions)))
})

Then('only the role {string} shows {string}', (position: string, badge: string) => {
  roles().should(($li) => {
    const withBadge = Array.from($li)
      .filter((li) => Array.from(li.querySelectorAll('*')).some((el) => el.children.length === 0 && text(el) === badge))
      .map((li) => text(li.querySelector('h3') as Element))
    expect(withBadge).to.deep.eq([position])
  })
})

Then('the role {string} shows {string}', (position: string, t: string) => {
  role(position).should('have.length', 1).and(($li) => expect(text($li[0])).to.contain(t))
})

Then('the role {string} lists the achievement {string}', (position: string, t: string) => {
  role(position).find('li').filter((_, el) => text(el) === t).should('have.length', 1)
})

Then('the role {string} has no highlight pills', (position: string) => {
  role(position).should('have.length', 1)
  // Pills are the short impact stats; with highlights: [] none are rendered.
  role(position).find('.stat').should('not.exist')
})

// ---------- About ----------

function cardOf(heading: string) {
  return cy
    .get('h2')
    .filter((_, el) => text(el) === heading)
    .first()
    .then(($h) => $h[0].parentElement as HTMLElement)
}

const IN_PROGRESS = ['Advanced TypeScript', 'Rust for web developers', 'System design', 'Swift concurrency']

Then('the Currently learning list has {int} rows', (n: number) => {
  cardOf('Currently learning').should(($c) => {
    const t = text($c[0] as Element)
    expect(IN_PROGRESS.filter((title) => t.includes(title))).to.have.length(n)
    expect(t).not.to.contain('Docker fundamentals')
  })
})

function learningRow(card: HTMLElement, title: string) {
  let el = Array.from(card.querySelectorAll<HTMLElement>('*')).find((e) => e.children.length === 0 && text(e) === title) as HTMLElement
  expect(el, `row ${title}`).to.exist
  // Climb to the row: the largest ancestor inside the card that holds only this course title.
  while (el.parentElement && el.parentElement !== card && IN_PROGRESS.filter((t) => text(el.parentElement!).includes(t)).length === 1) {
    el = el.parentElement
  }
  return el
}

Then('the last Currently learning row shows {string}', (t: string) => {
  cardOf('Currently learning').should(($c) => {
    expect(text(learningRow($c[0] as HTMLElement, 'Swift concurrency'))).to.contain(t)
  })
})

Then('the first Currently learning bar is {int}% wide', (pct: number) => {
  cardOf('Currently learning').should(($c) => {
    const row = learningRow($c[0] as HTMLElement, 'Advanced TypeScript')
    const bars = Array.from(row.querySelectorAll<HTMLElement>('*')).filter((e) => e.style.width === `${pct}%`)
    expect(bars.length, `an element ${pct}% wide`).to.be.gte(1)
    const bar = bars[0]
    const track = bar.parentElement as HTMLElement
    const ratio = bar.getBoundingClientRect().width / track.getBoundingClientRect().width
    expect(ratio).to.be.closeTo(pct / 100, 0.02)
  })
})

Then('Latest writing links to {string}', (hrefs: string) => {
  cardOf('Latest writing').should(($c) => {
    const links = Array.from(($c[0] as HTMLElement).querySelectorAll('a[href^="/blog/"]')).map((a) => a.getAttribute('href'))
    expect(links).to.deep.eq(list(hrefs))
  })
})

Then('the code card contains {string}', (t: string) => {
  cy.get('pre', { timeout: 1500 }).should(($p) => expect($p[0].textContent).to.contain(t))
})

Then('the code card eventually contains {string}', (t: string) => {
  cy.get('pre').scrollIntoView()
  cy.get('pre', { timeout: 60000 }).should(($p) => expect($p[0].textContent).to.contain(t))
})

// ---------- Blog ----------

const squash = (s: string) => s.replace(/\s+/g, '')

function filters() {
  return cy.get('[role="group"][aria-label="Filter posts by topic"] button')
}

Then('the topic filters are {string}', (names: string) => {
  filters().should(($b) => expect(Array.from($b).map((b) => squash(text(b)))).to.deep.eq(list(names).map(squash)))
})

function filter(name: string) {
  return filters().filter((_, b) => squash(text(b)) === squash(name))
}

When('the visitor clicks the filter {string}', (name: string) => {
  filter(name).click()
})

Then('the filter {string} is pressed', (name: string) => {
  filter(name).should('have.attr', 'aria-pressed', 'true')
  filters().filter('[aria-pressed="true"]').should('have.length', 1)
})

function featuredCards() {
  return cy.get('main').then(($m) =>
    Array.from($m[0].querySelectorAll<HTMLAnchorElement>('a[href^="/blog/"]')).filter((a) =>
      Array.from(a.querySelectorAll('*')).some((el) => el.children.length === 0 && text(el) === 'Featured')
    )
  )
}

Then('the featured post is {string}', (title: string) => {
  featuredCards().should((cards) => {
    expect(cards).to.have.length(1)
    expect(text(cards[0])).to.contain(title)
  })
})

Then('the featured post shows {string} and {string} and {string}', (a: string, b: string, c: string) => {
  featuredCards().should((cards) => {
    const t = text(cards[0])
    ;[a, b, c].forEach((x) => expect(t).to.contain(x))
  })
})

Then('there is no featured post', () => {
  featuredCards().should((cards) => expect(cards).to.have.length(0))
})

Given('no blog post is featured', () => {
  dataset().then((d) => mockData('blog', d.blog.map((p: any) => ({ ...p, featured: false }))))
})

function postCardsUnder(heading: RegExp) {
  return cy
    .get('h2')
    .filter((_, el) => heading.test(text(el)))
    .first()
    .then(($h) => {
      const section = $h[0].closest('section') as HTMLElement
      return Array.from(new Set(Array.from(section.querySelectorAll('a[href^="/blog/"]')).map((a) => a.getAttribute('href'))))
    })
}

Then('{string} has {int} post cards', (heading: string, n: number) => {
  postCardsUnder(new RegExp(`^${heading}$`)).should('have.length', n)
})

Then('the page shows {int} post cards', (n: number) => {
  cy.get('main').should(($m) => {
    const hrefs = new Set(Array.from($m[0].querySelectorAll('a[href^="/blog/"]')).map((a) => a.getAttribute('href')))
    expect(hrefs.size).to.eq(n)
  })
})

function postCard(title: string) {
  return cy.get('main a[href^="/blog/"]').filter((_, a) => Array.from(a.querySelectorAll('h2, h3')).some((h) => text(h) === title))
}

Then('the post card {string} links to {string}', (title: string, href: string) => {
  postCard(title).should('have.length.gte', 1).first().should('have.attr', 'href', href)
})

Then('the post card {string} shows {string}', (title: string, t: string) => {
  postCard(title).first().should(($a) => expect(text($a[0])).to.contain(t))
})

Then('the page shows an empty blog message', () => {
  bodyText().should('match', /(no posts|nothing|coming soon|on (the|its) way|check back)/i)
})

// ---------- Post ----------

Given('the visitor watches browser requests to the blog API', () => {
  cy.intercept('GET', '**/api/blog/**').as('blogApi')
})

Then('the browser made no request to {string}', (path: string) => {
  cy.get('@blogApi.all').then((calls: any) => {
    expect(calls.filter((c: any) => c.request.url.includes(path))).to.have.length(0)
  })
})

When('the visitor stubs the clipboard', () => {
  cy.window().then((win) => {
    if (!win.navigator.clipboard) {
      Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true })
    }
    cy.stub(win.navigator.clipboard, 'writeText').resolves().as('clipboard')
  })
})

Then('the clipboard received {string}', (value: string) => {
  cy.get('@clipboard').should('have.been.calledWith', value.replace('SITE', String(Cypress.config('baseUrl'))))
})

function sparkle() {
  return cy.get('button').filter((_, b) => /Send a sparkle|Sparkle sent/.test(text(b)))
}

When('the visitor clicks the sparkle button', () => {
  sparkle().first().click()
})

Then('the sparkle button is pressed and reads {string}', (t: string) => {
  sparkle().first().should('have.attr', 'aria-pressed', 'true').and(($b) => expect(text($b[0])).to.contain(t))
})

Then('Keep reading links to {string}', (hrefs: string) => {
  postCardsUnder(/^Keep reading$/).should('deep.equal', list(hrefs))
})

// ---------- Learning ----------

Then('the course {string} shows {string}', (title: string, t: string) => {
  cy.get('main').should(($m) => {
    let el = Array.from($m[0].querySelectorAll<HTMLElement>('*')).find((e) => e.children.length === 0 && text(e) === title)
    expect(el, `course ${title}`).to.exist
    for (let i = 0; i < 4 && el && !text(el).includes(t); i += 1) el = el.parentElement as HTMLElement
    expect(text(el as HTMLElement), `card of ${title}`).to.contain(t)
  })
})

Then('the page shows a note that skills couldn\'t load', () => {
  bodyText().should('match', /couldn.?t load (the )?skills/i)
})

// ---------- CV ----------

Then('the CV section headings are {string}', (names: string) => {
  cy.get('h2').should(($h) => expect(Array.from($h).map(text)).to.deep.eq(list(names)))
})

function cvWith(change: (cv: any) => void) {
  dataset().then((d) => {
    change(d.cv)
    mockData('cv', d.cv)
  })
}

Given('the CV mock has one certification', () => {
  cvWith((cv) => {
    cv.certifications = [{ id: 1, name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', issue_date: '2024-03-01', credential_url: null }]
  })
})

Given('the CV mock has no recommendation and an empty AI paragraph', () => {
  cvWith((cv) => {
    cv.recommendation = null
    cv.profile.cv_ai_workflow = ''
  })
})

Given('the CV mock has no profile and no recommendation keys', () => {
  cvWith((cv) => {
    delete cv.profile
    delete cv.recommendation
  })
})

Then('the CV Profile text is {string}', (t: string) => {
  cy.get('h2')
    .filter((_, el) => text(el) === 'Profile')
    .then(($h) => {
      const section = $h[0].closest('section') as HTMLElement
      expect(text(section).replace(/^Profile\s*/, '')).to.eq(t)
    })
})

Then('the CV text has no phone number', () => {
  bodyText().then((t) => expect(t.match(/\+?\d[\d\s]{9,}/), 'phone-like number').to.eq(null))
})

Then('the CV mentions {string}', (t: string) => {
  cy.document().then((doc) => {
    const inDom = text(doc.body).includes(t)
    let inCss = false
    Array.from(doc.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules).forEach((r) => {
          if (r.cssText.includes(t)) inCss = true
        })
      } catch {
        /* cross-origin sheet */
      }
    })
    expect(inDom || inCss, `"${t}" in the page or its print CSS`).to.eq(true)
  })
})
