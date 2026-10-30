/// <reference types="cypress" />
import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor'
import { ADMIN_URL, mock } from './mockApi'
import { exact, norm, state } from './helpers'
import { accName } from './shell.steps'

// ---------- fixture helpers
Given('the admin fixture has every message read', () => {
  cy.wrap(null).then(() => mock.db.messages.forEach((m: any) => (m.read = true)))
})

Given("the admin's clipboard works", () => {
  state.clipboard = 'ok'
})

Given("the admin's clipboard fails", () => {
  state.clipboard = 'fail'
})

// ---------- dashboard
Then('the admin sees the first Needs attention row reads {string} with {string}', (title: string, action: string) => {
  cy.contains('h2', 'Needs attention').closest('section').find('ul.rows > li').first().should(($r) => {
    expect(norm($r.find('.r1').text())).to.eq(title)
    expect(norm($r.find('a, button').last().text())).to.eq(action)
  })
})

// ---------- messages
const list = () => cy.get('section[aria-label="Message list"]')
const nameOf = (b: HTMLElement) => norm((b.querySelector('span span span') as HTMLElement)?.textContent || '')

Then('the admin sees the message list reads {string}', (names: string) => {
  list().find('button.ib-item').should(($b) => {
    expect($b.toArray().map((b) => nameOf(b as HTMLElement))).to.deep.eq(names.split(', '))
  })
})

When('the admin opens the message from {string}', (name: string) => {
  list().find('button.ib-item').filter((_, b) => nameOf(b as HTMLElement) === name).first().click()
})

Then('the admin sees the reader shows {string} and {string} on separate lines', (a: string, b: string) => {
  cy.get('.ib-body').should(($p) => {
    const el = $p[0]
    expect(el.textContent).to.contain(a)
    expect(el.textContent).to.contain(b)
    expect(el.textContent).to.match(/\n/)
    expect(getComputedStyle(el).whiteSpace).to.match(/pre/)
  })
})

Then('the admin sees the sidebar Messages badge {string}', (n: string) => {
  cy.get('nav.ad-side a[href="/messages"]').should(($a) => expect(accName($a[0])).to.eq(`Messages ${n} unread`))
})

Then('the admin sees no sidebar Messages badge', () => {
  cy.get('nav.ad-side a[href="/messages"]').should(($a) => {
    expect($a.find('.count').length).to.eq(0)
    expect(accName($a[0])).to.eq('Messages')
  })
})

Then('the admin sees the sheet link {string}', (name: string) => {
  cy.get('[role="dialog"][aria-label="Admin menu"] a[href="/messages"]').should(($a) => expect(accName($a[0])).to.eq(name))
})

Then('the admin sees the console never shows {string} or {string}', (a: string, b: string) => {
  cy.wait(500)
  cy.wrap(null).then(() => {
    const hits = state.console.filter((l) => l.includes(a) || l.includes(b))
    expect(hits, 'console lines with message content').to.deep.eq([])
  })
})

Then('the admin sees the message list and not the reader', () => {
  list().should('be.visible')
  cy.get('section.ib-read').should('not.be.visible')
})

Then('the admin sees the reader and not the message list', () => {
  cy.get('section.ib-read').should('be.visible')
  list().should('not.be.visible')
  cy.contains('button', '← All messages').should('be.visible')
})

// ---------- share
const shareBtn = (title: string) => `button[aria-label="Share ${title} on LinkedIn"]`

Then('the admin sees a Share button for {string}', (title: string) => {
  cy.get(shareBtn(title)).should('be.visible')
})

Then('the admin sees no Share button for {string}', (title: string) => {
  cy.get('ul.rows > li.row').should('have.length.at.least', 1)
  cy.get(shareBtn(title)).should('not.exist')
})

const shareText = () => cy.get('#sh-text')

Then('the admin sees the share text is:', (doc: string) => {
  shareText().should('have.value', doc)
})

Then('the admin sees the share text starts with {string}', (start: string) => {
  shareText().should(($t) => expect(String($t.val())).to.match(new RegExp('^' + start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))))
})

Then('the admin sees the starter {string} is pressed', (label: string) => {
  cy.get('[aria-label="Starting text"] button').filter((_, b) => norm(b.textContent || '') === label).should('have.attr', 'aria-pressed', 'true')
})

Then('the admin sees no starter is pressed', () => {
  cy.get('[aria-label="Starting text"] button[aria-pressed="true"]').should('not.exist')
})

When('the admin adds {string} to the share text', (t: string) => {
  shareText().type(t, { delay: 0 })
})

When('the admin sets the share text to {int} characters', (n: number) => {
  shareText().then(($t) => {
    const el = $t[0] as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!
    setter.call(el, 'x'.repeat(n))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
})

Then('the admin sees the share counter is marked over', () => {
  cy.get('.counter').should('have.class', 'over')
})

Then('the admin sees the share preview shows {string} and {string}', (title: string, domain: string) => {
  cy.get('[data-testid="li-card"]').should(($c) => {
    expect(norm($c.text())).to.contain(title)
    expect(norm($c.text())).to.contain(domain)
  })
})

Then('the admin sees the clipboard got the share text', () => {
  cy.wrap(null).should(() => {
    expect(state.copied.length).to.be.greaterThan(0)
    expect(state.copied[state.copied.length - 1]).to.match(/^New post: How I Built Automatic Updates/)
  })
})

Then('the admin sees LinkedIn opened at {string}', (url: string) => {
  cy.wrap(null).should(() => {
    expect(state.opened.length, 'window.open called').to.eq(1)
    expect(state.opened[0][0]).to.eq(url)
  })
})

Then('the admin sees LinkedIn was not opened', () => {
  cy.wait(400)
  cy.wrap(null).then(() => expect(state.opened).to.have.length(0))
})

Then('the admin sees the share text is focused and selected', () => {
  shareText().should(($t) => {
    const el = $t[0] as HTMLTextAreaElement
    expect(el.ownerDocument.activeElement).to.eq(el)
    expect(el.selectionEnd - el.selectionStart).to.eq(el.value.length)
  })
})

// ---------- analytics v2
Then('the admin sees the Campaigns card reads {string}', (names: string) => {
  cy.contains('h2', exact('Campaigns')).closest('section').find('li').should(($li) => {
    const got = $li.toArray().map((l) => norm((l.querySelector('span span') as HTMLElement)?.textContent || ''))
    expect(got).to.deep.eq(names.split(', '))
  })
})

Then('the admin sees no Campaigns card', () => {
  cy.contains('h2', 'Where visits come from').should('be.visible')
  cy.contains('h2', exact('Campaigns')).should('not.exist')
})

// ---------- settings
Then('the admin sees the {string} link opens {string} in a new tab', (name: string, href: string) => {
  cy.contains('a', exact(name)).should('have.attr', 'href', href).and('have.attr', 'target', '_blank').and('have.attr', 'rel').and('match', /noopener/)
})

// ---------- flags
Then('the admin sees the flag {string} has a description', (label: string) => {
  cy.get('ul.rows > li').filter((_, r) => norm(r.textContent || '').includes(label)).first().should(($r) => {
    const text = norm($r.text()).replace(label, '').replace(/\b(On|Off|show_colourways|Delete)\b/g, '').trim()
    expect(text.length, 'description text').to.be.greaterThan(10)
  })
})

Then('the admin sees no Delete for the flags {string}', (keys: string) => {
  cy.get('ul.rows > li').should('have.length.at.least', 3)
  keys.split(', ').forEach((k) => cy.get(`button[aria-label="Delete ${k}"]`).should('not.exist'))
})

// ---------- noindex
Then('the admin sees the meta robots is {string}', (content: string) => {
  cy.get('meta[name="robots"]').should('have.attr', 'content', content)
})

Then('the admin sees robots.txt is text that allows Googlebot and Bingbot and disallows everyone else', () => {
  cy.request(ADMIN_URL + '/robots.txt').then((r) => {
    expect(r.headers['content-type']).to.match(/^text\/plain/)
    const body = String(r.body)
    expect(body).not.to.match(/<html/i)
    const groups: Record<string, string[]> = {}
    let agent = ''
    body.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).forEach((l) => {
      const [k, ...v] = l.split(':')
      const val = v.join(':').trim()
      if (/^user-agent$/i.test(k)) groups[(agent = val)] = groups[val] || []
      else groups[agent].push(`${k.trim()}: ${val}`)
    })
    expect(groups.Googlebot).to.deep.eq(['Allow: /'])
    expect(groups.Bingbot).to.deep.eq(['Allow: /'])
    expect(groups['*']).to.deep.eq(['Disallow: /'])
  })
})

Then('the admin sees vercel.json sends X-Robots-Tag {string} on every path and serves robots.txt as a file', (value: string) => {
  cy.readFile('packages/admin/vercel.json').then((cfg: any) => {
    const routes: any[] = cfg.routes
    const first = routes[0]
    expect(first.src).to.eq('/(.*)')
    expect(first.continue).to.eq(true)
    expect(first.headers['X-Robots-Tag']).to.eq(value)
    // the first route that handles /robots.txt (after the header route) must not be the SPA fallback
    const handler = routes.slice(1).find((r) => new RegExp('^' + r.src + '$').test('/robots.txt'))
    expect(handler.dest).to.eq('/$1')
    const manifest = routes.slice(1).find((r) => new RegExp('^' + r.src + '$').test('/site.webmanifest'))
    expect(manifest.dest).to.eq('/$1')
  })
})
