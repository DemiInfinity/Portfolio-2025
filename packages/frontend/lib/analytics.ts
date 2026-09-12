export const ANALYTICS_OPT_OUT_KEY = 'portfolio_analytics_opt_out'

export function isAnalyticsOptedOut(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}

export function setAnalyticsOptOut(optOut: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (optOut) {
      window.localStorage.setItem(ANALYTICS_OPT_OUT_KEY, '1')
    } else {
      window.localStorage.removeItem(ANALYTICS_OPT_OUT_KEY)
    }
  } catch {
    // Private mode or blocked storage — fail closed for opt-out writes
  }
}

// Simple analytics tracking utility
class Analytics {
  private sessionId: string
  private startTime: number
  private currentPage: string = ''

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()
    
    // Track page visibility changes
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
      window.addEventListener('beforeunload', this.handlePageUnload.bind(this))
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async sendTrackingData(data: {
    page_path: string
    page_title?: string
    session_id: string
    referrer?: string
    visit_duration?: number
  }) {
    if (isAnalyticsOptedOut()) return

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
        : 'https://api.demitaylornimmo.com/api'
      
      await fetch(`${API_BASE_URL}/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.debug('Analytics tracking failed:', error)
    }
  }

  trackPageView(path: string, title?: string) {
    if (typeof window === 'undefined' || isAnalyticsOptedOut()) return

    const referrer = document.referrer || undefined
    this.currentPage = path
    this.startTime = Date.now()

    this.sendTrackingData({
      page_path: path,
      page_title: title || document.title,
      session_id: this.sessionId,
      referrer,
    })
  }

  private handleVisibilityChange() {
    if (isAnalyticsOptedOut()) return
    if (document.hidden && this.currentPage) {
      const duration = Math.round((Date.now() - this.startTime) / 1000)
      if (duration > 5) { // Only track if user spent more than 5 seconds
        this.sendTrackingData({
          page_path: this.currentPage,
          session_id: this.sessionId,
          visit_duration: duration,
        })
      }
    } else if (!document.hidden) {
      this.startTime = Date.now()
    }
  }

  private handlePageUnload() {
    if (isAnalyticsOptedOut()) return
    if (this.currentPage) {
      const duration = Math.round((Date.now() - this.startTime) / 1000)
      if (duration > 5) {
        // Use sendBeacon for reliable tracking on page unload
        const data = JSON.stringify({
          page_path: this.currentPage,
          session_id: this.sessionId,
          visit_duration: duration,
        })
        
        if (navigator.sendBeacon) {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
            ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
            : 'https://api.demitaylornimmo.com/api'
          navigator.sendBeacon(`${API_BASE_URL}/analytics/track`, data)
        }
      }
    }
  }
}

// Create singleton instance
const analytics = new Analytics()

export default analytics
