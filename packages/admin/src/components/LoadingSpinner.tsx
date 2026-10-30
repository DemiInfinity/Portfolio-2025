const LoadingSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} role="status">
    <span className="spin" aria-hidden="true" style={{ borderColor: '#d9cfe6', borderTopColor: '#5b21b6' }} />
    <span className="mute">Loading</span>
  </div>
)

export default LoadingSpinner
