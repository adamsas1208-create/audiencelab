import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Sentry } from './lib/sentry.js'
import App from './App.jsx'
import ErrorFallback from './components/ErrorFallback.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { DataProvider } from './context/DataProvider.jsx'
import AtmosphereProvider from './design/atmosphere/AtmosphereProvider.jsx'
import SkyCanvas from './design/atmosphere/SkyCanvas.jsx'
import CursorAurora from './design/components/CursorAurora.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Last line of defense against a render-error white-screen (the exact
        failure mode the bandsOpacity outage caused). Works as a plain React
        error boundary even with no Sentry DSN configured — it just won't
        have anywhere to report the error to. */}
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <AtmosphereProvider>
        {/* The living sky sits behind everything the app renders. */}
        <SkyCanvas />
        <AuthProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AuthProvider>
        {/* The aurora comet trail floats above everything (pointer-events: none). */}
        <CursorAurora />
      </AtmosphereProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
