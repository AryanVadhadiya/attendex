import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Log browser navigation timing once per full load.
// This uses the Navigation Timing API, which already measures
// from navigationStart to loadEventEnd.
try {
  const navEntries = performance.getEntriesByType('navigation')
  if (navEntries && navEntries[0]) {
    const nav = navEntries[0]
    const seconds = (nav.duration / 1000).toFixed(2)
    console.log('[PERF] navigation duration:', seconds + 's')
  }
} catch (_) {
  // ignore if performance API is not available
}

// In dev, StrictMode double-invokes effects which can cause
// extra network calls and make the app *feel* slower.
// We render without StrictMode to keep dev behavior closer
// to production for this performance-sensitive app.
createRoot(document.getElementById('root')).render(
  <App />
)
