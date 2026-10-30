/**
 * Maintained bot / crawler / preview-fetcher list for analytics (H-23).
 * A request whose User-Agent is empty or matches is dropped at /track (204)
 * and ignored by the summary. Add new names here; the test list in
 * utils/__tests__/bots.test.ts covers known bots and real browsers.
 */
export const BOT_UA_PATTERNS: string[] = [
  // generic
  'bot\\b', 'bot/', 'bot;', 'crawl', 'spider', 'slurp', 'scrape', 'archiver', 'fetcher',
  // link previews
  'linkedinbot', 'slackbot', 'slack-imgproxy', 'facebookexternalhit', 'facebookcatalog', 'meta-externalagent',
  'twitterbot', 'discordbot', 'whatsapp', 'telegrambot', 'skypeuripreview', 'embedly', 'iframely',
  'redditbot', 'applebot', 'bingpreview', 'vkshare', 'quora link preview', 'outbrain',
  // headless / automation / monitoring
  'headlesschrome', 'headless', 'phantomjs', 'puppeteer', 'playwright', 'selenium', 'webdriver',
  'lighthouse', 'chrome-lighthouse', 'pagespeed', 'gtmetrix', 'pingdom', 'uptimerobot', 'uptime',
  'statuscake', 'site24x7', 'newrelicpinger', 'datadog', 'checkly', 'better uptime', 'vercel-screenshot', 'vercelbot',
  // scripts and libraries
  'curl/', 'wget/', 'python-requests', 'python-urllib', 'python/', 'aiohttp', 'httpx', 'axios/', 'node-fetch',
  'undici', 'go-http-client', 'okhttp', 'java/', 'libwww-perl', 'ruby', 'php/', 'postmanruntime', 'insomnia',
  // AI and SEO crawlers
  'gptbot', 'chatgpt-user', 'oai-searchbot', 'claudebot', 'claude-web', 'anthropic-ai', 'perplexitybot',
  'ccbot', 'bytespider', 'amazonbot', 'ahrefs', 'semrush', 'mj12bot', 'dotbot', 'petalbot', 'yandex',
  'baiduspider', 'duckduckbot', 'googleother', 'google-inspectiontool', 'mediapartners-google', 'adsbot',
  'storebot', 'feedfetcher', 'bingbot', 'msnbot', 'seznambot', 'sogou'
]

export const BOT_UA_RE = new RegExp(BOT_UA_PATTERNS.join('|'), 'i')

export function isBotUserAgent(userAgent: unknown): boolean {
  const ua = typeof userAgent === 'string' ? userAgent.trim() : ''
  if (!ua) return true
  return BOT_UA_RE.test(ua)
}
