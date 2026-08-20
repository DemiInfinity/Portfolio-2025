import { anonymizeIp } from '../anonymizeIp'

describe('anonymizeIp', () => {
  it('zeroes the last octet of an IPv4 address', () => {
    expect(anonymizeIp('203.0.113.45')).toBe('203.0.113.0')
  })

  it('zeroes the last octet of a private IPv4 address', () => {
    expect(anonymizeIp('192.168.1.42')).toBe('192.168.1.0')
  })

  it('handles an IPv4 address that is already .0', () => {
    expect(anonymizeIp('10.0.0.0')).toBe('10.0.0.0')
  })

  it('treats a compressed IPv4-mapped IPv6 address as IPv4', () => {
    expect(anonymizeIp('::ffff:203.0.113.45')).toBe('203.0.113.0')
  })

  it('treats an uncompressed IPv4-mapped IPv6 address as IPv4', () => {
    expect(anonymizeIp('0:0:0:0:0:ffff:203.0.113.45')).toBe('203.0.113.0')
  })

  it('keeps the first 48 bits and zeroes the rest of a full IPv6 address', () => {
    expect(anonymizeIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe(
      '2001:db8:85a3:0:0:0:0:0'
    )
  })

  it('keeps the first 48 bits and zeroes the rest of a compressed IPv6 address', () => {
    expect(anonymizeIp('2001:db8::1')).toBe('2001:db8:0:0:0:0:0:0')
  })

  it('handles the IPv6 loopback address', () => {
    expect(anonymizeIp('::1')).toBe('0:0:0:0:0:0:0:0')
  })

  it('strips an IPv6 zone id before anonymizing', () => {
    expect(anonymizeIp('fe80::1%eth0')).toBe('fe80:0:0:0:0:0:0:0')
  })

  it('returns an empty string for null/undefined input', () => {
    expect(anonymizeIp(null)).toBe('')
    expect(anonymizeIp(undefined)).toBe('')
  })

  it('fails closed on unrecognized input rather than storing it raw', () => {
    expect(anonymizeIp('not-an-ip')).toBe('0.0.0.0')
  })
})
