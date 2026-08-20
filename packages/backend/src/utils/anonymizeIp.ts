/**
 * Anonymizes an IP address for GDPR-compliant analytics storage.
 *
 * - IPv4: zeroes the last octet (e.g. 203.0.113.45 -> 203.0.113.0)
 * - IPv6: keeps the first 48 bits (first 3 hextets) and zeroes the
 *   remaining 80 bits (e.g. 2001:db8:85a3:8d3:1319:8a2e:370:7348 ->
 *   2001:db8:85a3:0:0:0:0:0)
 * - IPv4-mapped IPv6 addresses (::ffff:203.0.113.45) are treated as IPv4
 *
 * This mirrors the "IP truncation" approach used by GA/Matomo: enough
 * precision survives for coarse geographic aggregation, but the result no
 * longer identifies an individual visitor.
 *
 * Unrecognized input is discarded (a sentinel is returned instead) rather
 * than stored as-is - for a control whose entire purpose is GDPR
 * compliance, an unrecognized format must fail closed, not fail open.
 */
export function anonymizeIp(ip: string | undefined | null): string {
  if (!ip) return ip ?? ''

  let addr = ip.trim()

  // Strip an IPv6 zone id if present (e.g. fe80::1%eth0)
  addr = addr.split('%')[0]

  // IPv4-mapped/compatible IPv6 address, e.g. ::ffff:203.0.113.45 or the
  // uncompressed 0:0:0:0:0:ffff:203.0.113.45 - either way, if it's an IPv6
  // address ending in a dotted-quad, treat the dotted-quad as the real IPv4.
  if (addr.includes(':')) {
    const trailingIpv4 = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
    if (trailingIpv4) {
      addr = trailingIpv4[1]
    }
  }

  // IPv4
  const ipv4Match = addr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const [, o1, o2, o3] = ipv4Match
    return `${o1}.${o2}.${o3}.0`
  }

  // IPv6
  if (addr.includes(':')) {
    const hextets = expandIpv6(addr)
    if (hextets) {
      return hextets.map((h, i) => (i < 3 ? h : '0')).join(':')
    }
  }

  // Unrecognized format - fail closed rather than storing a raw, possibly
  // attacker-controlled (X-Forwarded-For is client-supplied) value.
  console.warn(`anonymizeIp: unrecognized IP format, discarding value`)
  return '0.0.0.0'
}

/** Expands a possibly-compressed IPv6 address into 8 hextets, or null if malformed. */
function expandIpv6(addr: string): string[] | null {
  const doubleColonCount = (addr.match(/::/g) || []).length
  if (doubleColonCount > 1) return null

  let headParts: string[]
  let tailParts: string[]

  if (doubleColonCount === 1) {
    const [head, tail] = addr.split('::')
    headParts = head ? head.split(':') : []
    tailParts = tail ? tail.split(':') : []
    const missing = 8 - headParts.length - tailParts.length
    if (missing < 0) return null
    return [...headParts, ...new Array(missing).fill('0'), ...tailParts]
  }

  const parts = addr.split(':')
  if (parts.length !== 8) return null
  return parts.map((p) => (p === '' ? '0' : p))
}
