import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import PDFDocument from 'pdfkit'
import type { CvData } from './cvData'

/**
 * Renders the CV PDF from the CV aggregate (H-21 / D-8), following CV-1/CV-2:
 * A4, single column, real selectable text, Poppins + Playfair Display.
 * Design sizes are px on a 794px-wide page; A4 is 595pt, so pt = px * 0.75.
 */

export const OWNER_NAME = 'Demi Taylor Nimmo'
export const CV_FILE_NAME = 'Demi-Taylor-Nimmo-CV.pdf'

const px = (v: number) => v * 0.75

const C = {
  ink: '#1f1a2e',
  heading: '#2e1065',
  accent: '#5b21b6',
  muted: '#5a5068',
  rule: '#ddd0f5',
  marker: '#a78bfa',
  panel: '#f7f2ff',
  barFrom: '#f472b6',
  barTo: '#7c3aed'
}

const PAGE = { width: 595.28, height: 841.89 }
const MARGIN_X = px(60)
const MARGIN_TOP = px(44) + px(8)
const FOOTER_H = px(28) + px(20)
const CONTENT_W = PAGE.width - MARGIN_X * 2

export const FONT_DIR = path.join(__dirname, '../../assets/fonts')

type FontKey = 'regular' | 'medium' | 'semibold' | 'display'
const FONT_FILES: Record<FontKey, string> = {
  regular: 'Poppins-Regular.ttf',
  medium: 'Poppins-Medium.ttf',
  semibold: 'Poppins-SemiBold.ttf',
  display: 'PlayfairDisplay-Bold.ttf'
}
const FALLBACK: Record<FontKey, string> = {
  regular: 'Helvetica',
  medium: 'Helvetica',
  semibold: 'Helvetica-Bold',
  display: 'Times-Bold'
}

function registerFonts(doc: PDFKit.PDFDocument): Record<FontKey, string> {
  const names = { ...FALLBACK }
  for (const key of Object.keys(FONT_FILES) as FontKey[]) {
    try {
      const file = path.join(FONT_DIR, FONT_FILES[key])
      doc.registerFont(key, fs.readFileSync(file))
      names[key] = key
    } catch (error) {
      console.warn(`CV PDF: font ${FONT_FILES[key]} not loaded, using ${FALLBACK[key]}`, error instanceof Error ? error.message : error)
    }
  }
  return names
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthYear(date: unknown): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(date ?? ''))
  if (!m) return ''
  return `${MONTHS[Number(m[2]) - 1] || ''} ${m[1]}`.trim()
}

export function dateRange(start: unknown, end: unknown, presentLabel = 'Present'): string {
  const a = monthYear(start)
  const b = end ? monthYear(end) : presentLabel
  return a ? `${a} – ${b}` : b
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

export interface RenderOptions {
  /** Uncompressed streams so tests can search the text. */
  compress?: boolean
}

export function renderCvPdf(cv: CvData, options: RenderOptions = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const settings: PDFKit.PDFDocumentOptions = {
      size: 'A4',
      margins: { top: MARGIN_TOP, bottom: FOOTER_H, left: MARGIN_X, right: MARGIN_X },
      bufferPages: true,
      compress: options.compress !== false,
      info: { Title: `${OWNER_NAME} CV`, Author: OWNER_NAME, Subject: cv.profile.cv_headline }
    }
    // Start on our bundled TTF instead of pdfkit's default Helvetica: pdfkit
    // loads its standard fonts through a dynamic require that Vercel's file
    // tracer doesn't follow, so they may be missing from the deployed bundle.
    let doc: PDFKit.PDFDocument
    try {
      doc = new PDFDocument({ ...settings, font: path.join(FONT_DIR, FONT_FILES.regular) })
    } catch (error) {
      console.warn('CV PDF: bundled default font unavailable, using pdfkit default', error instanceof Error ? error.message : error)
      doc = new PDFDocument(settings)
    }
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
      draw(doc, cv)
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

function draw(doc: PDFKit.PDFDocument, cv: CvData) {
  const F = registerFonts(doc)

  const topBar = () => {
    const grad = doc.linearGradient(0, 0, PAGE.width, 0)
    grad.stop(0, C.barFrom).stop(1, C.barTo)
    doc.save().rect(0, 0, PAGE.width, px(8)).fill(grad).restore()
  }
  topBar()
  doc.on('pageAdded', () => {
    topBar()
    doc.x = MARGIN_X
    doc.y = MARGIN_TOP
  })

  const bottom = () => PAGE.height - FOOTER_H
  const ensure = (needed: number) => {
    if (doc.y + needed > bottom()) doc.addPage()
  }
  const gap = (v: number) => {
    doc.y += v
  }

  const body = (text: string, opts: PDFKit.Mixins.TextOptions = {}) => {
    doc.font(F.regular).fontSize(px(13.5)).fillColor(C.ink).text(text, MARGIN_X, doc.y, { width: CONTENT_W, lineGap: px(4), ...opts })
  }

  const heading = (title: string) => {
    ensure(px(19) + px(40))
    gap(px(14))
    doc.font(F.display).fontSize(px(19)).fillColor(C.heading)
    const y = doc.y
    doc.text(title, MARGIN_X, y, { width: CONTENT_W, lineBreak: false })
    const w = doc.widthOfString(title)
    const ruleY = y + px(19) * 0.62
    doc.save().moveTo(MARGIN_X + w + px(10), ruleY).lineTo(MARGIN_X + CONTENT_W, ruleY).lineWidth(0.75).strokeColor(C.rule).stroke().restore()
    doc.x = MARGIN_X
    doc.y = y + px(19) * 1.3 + px(6)
  }

  const bullets = (items: string[]) => {
    const indent = px(17)
    for (const item of items) {
      doc.font(F.regular).fontSize(px(13))
      const h = doc.heightOfString(item, { width: CONTENT_W - indent, lineGap: px(3) })
      ensure(Math.min(h, px(40)))
      const y = doc.y
      doc.save().circle(MARGIN_X + px(5), y + px(13) * 0.62, px(2.2)).fill(C.marker).restore()
      doc.fillColor(C.ink).text(item, MARGIN_X + indent, y, { width: CONTENT_W - indent, lineGap: px(3) })
      gap(px(3))
    }
    doc.x = MARGIN_X
  }

  /** Bold title on the left, purple date on the right, same baseline. */
  const titleRow = (title: string, when: string) => {
    ensure(px(60))
    const y = doc.y
    doc.font(F.medium).fontSize(px(12.5))
    const whenW = when ? doc.widthOfString(when) + px(12) : 0
    if (when) doc.fillColor(C.accent).text(when, MARGIN_X, y + px(1.5), { width: CONTENT_W, align: 'right', lineBreak: false })
    doc.font(F.semibold).fontSize(px(14.5)).fillColor(C.ink).text(title, MARGIN_X, y, { width: CONTENT_W - whenW })
    doc.x = MARGIN_X
  }

  const muted = (text: string) => {
    doc.font(F.regular).fontSize(px(12.5)).fillColor(C.muted).text(text, MARGIN_X, doc.y + px(2), { width: CONTENT_W })
    gap(px(3))
  }

  // ----- Header -----
  doc.font(F.display).fontSize(px(36)).fillColor(C.heading).text(OWNER_NAME, MARGIN_X, MARGIN_TOP, { width: CONTENT_W })
  doc.font(F.medium).fontSize(px(15)).fillColor(C.accent).text(cv.profile.cv_headline, MARGIN_X, doc.y + px(4), { width: CONTENT_W })
  gap(px(16))

  // ----- Contact panel -----
  const contact = cv.profile.contact
  const parts: { label: string; value: string; link?: string }[] = []
  if (contact.linkedin_url) parts.push({ label: 'LinkedIn', value: 'Contact me on LinkedIn', link: contact.linkedin_url })
  if (contact.email) parts.push({ label: 'Email', value: contact.email, link: `mailto:${contact.email}` })
  if (contact.portfolio_url) parts.push({ label: 'Portfolio', value: displayUrl(contact.portfolio_url), link: contact.portfolio_url })
  if (contact.github_url) parts.push({ label: 'GitHub', value: displayUrl(contact.github_url).replace(/^github\.com\//, ''), link: contact.github_url })
  if (contact.location) parts.push({ label: 'Location', value: contact.location })
  if (parts.length) {
    const padX = px(16)
    const padY = px(12)
    const innerW = CONTENT_W - padX * 2
    doc.fontSize(px(12.5))
    // Lay the items out in rows ourselves so each label/value pair stays together.
    const rows: (typeof parts)[] = [[]]
    let rowW = 0
    const itemW = (p: (typeof parts)[number]) =>
      doc.font(F.semibold).widthOfString(`${p.label}: `) + doc.font(F.regular).widthOfString(p.value)
    for (const p of parts) {
      const w = itemW(p) + px(18)
      if (rowW + w > innerW && rows[rows.length - 1].length) {
        rows.push([])
        rowW = 0
      }
      rows[rows.length - 1].push(p)
      rowW += w
    }
    const lineH = px(12.5) * 1.5
    const panelH = padY * 2 + rows.length * lineH + (rows.length - 1) * px(6)
    const top = doc.y
    doc.save().roundedRect(MARGIN_X, top, CONTENT_W, panelH, px(12)).fill(C.panel).restore()
    rows.forEach((row, i) => {
      let x = MARGIN_X + padX
      const y = top + padY + i * (lineH + px(6))
      for (const p of row) {
        doc.font(F.semibold).fillColor(C.ink).text(`${p.label}: `, x, y, { lineBreak: false })
        x += doc.widthOfString(`${p.label}: `)
        doc.font(F.regular).fillColor(p.link ? C.accent : C.ink).text(p.value, x, y, { lineBreak: false, link: p.link })
        x += doc.widthOfString(p.value) + px(18)
      }
    })
    doc.x = MARGIN_X
    doc.y = top + panelH + px(8)
  }

  // ----- Profile -----
  heading('Profile')
  body(cv.profile.cv_profile)

  // ----- Experience -----
  if (cv.experience.length) {
    heading('Experience')
    cv.experience.forEach((role, i) => {
      if (i) gap(px(12))
      titleRow([role.position, role.company].filter(Boolean).join(' · '), dateRange(role.start_date, role.current ? null : role.end_date))
      if (role.location) muted(String(role.location))
      const items: string[] = Array.isArray(role.achievements) ? role.achievements : []
      if (items.length) {
        gap(px(2))
        bullets(items)
      } else if (role.description) {
        body(String(role.description), { lineGap: px(3) })
      }
    })
  }

  // ----- Skills -----
  if (cv.skills.length) {
    heading('Skills')
    for (const group of cv.skills) {
      ensure(px(24))
      doc.font(F.semibold).fontSize(px(13)).fillColor(C.ink).text(`${group.category}: `, MARGIN_X, doc.y, { width: CONTENT_W, continued: true, lineGap: px(3) })
      doc.font(F.regular).text(group.items.map((s) => s.name).join(', '))
      gap(px(3))
    }
  }

  // ----- AI-assisted workflow -----
  if (cv.profile.cv_ai_workflow && cv.profile.cv_ai_workflow.trim()) {
    heading('AI-assisted workflow')
    body(cv.profile.cv_ai_workflow)
  }

  // ----- Selected projects -----
  const projects = cv.projects.slice(0, 3)
  if (projects.length) {
    heading('Selected projects')
    projects.forEach((p, i) => {
      if (i) gap(px(10))
      titleRow(String(p.title), '')
      if (p.description) body(String(p.description), { lineGap: px(3) })
      const tech: string[] = Array.isArray(p.technologies) ? p.technologies : []
      if (tech.length) muted(tech.join(' · '))
    })
  }

  // ----- Education -----
  if (cv.education.length) {
    heading('Education')
    cv.education.forEach((e, i) => {
      if (i) gap(px(10))
      const degree = [e.degree, e.field_of_study].filter(Boolean).join(', ')
      titleRow([degree, e.institution].filter(Boolean).join(' · '), dateRange(e.start_date, e.end_date))
      const extra = [e.location, e.grade ? `Grade: ${e.grade}` : ''].filter(Boolean).join(' · ')
      if (extra) muted(extra)
      if (Array.isArray(e.achievements) && e.achievements.length) bullets(e.achievements)
    })
  }

  // ----- Currently learning -----
  if (cv.learning.length) {
    heading('Currently learning')
    bullets(cv.learning.map((l) => (l.provider ? `${l.title} (${l.provider})` : String(l.title))))
  }

  // ----- Certifications (omitted when none) -----
  if (cv.certifications.length) {
    heading('Certifications')
    for (const c of cv.certifications) {
      titleRow([c.name, c.issuer].filter(Boolean).join(' · '), monthYear(c.issue_date))
      gap(px(4))
    }
  }

  // ----- Recommendation (omitted when null) -----
  const rec = cv.recommendation
  if (rec) {
    heading('Recommendation')
    body(`“${rec.quote}”`, { lineGap: px(3) })
    const roleLine = [rec.role && rec.company ? `${rec.role} at ${rec.company}` : rec.role || rec.company, rec.relationship]
      .filter(Boolean)
      .join(' · ')
    muted([rec.name, roleLine].filter(Boolean).join(', '))
  }

  // ----- Footer on every page -----
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    const savedBottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    const y = PAGE.height - px(28) - px(12)
    doc.font(F.regular).fontSize(px(12)).fillColor(C.muted)
    doc.text('Phone available on request', MARGIN_X, y, { lineBreak: false })
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, MARGIN_X, y, { width: CONTENT_W, align: 'right', lineBreak: false })
    doc.page.margins.bottom = savedBottom
  }
}

/** sha256 of the aggregate minus `updated_at`: unchanged content → same hash. */
export function cvContentHash(cv: CvData): string {
  const { updated_at: _ignored, ...content } = cv
  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex')
}
