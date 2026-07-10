import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { DataProvider } from './context/DataProvider.jsx'
import AtmosphereProvider from './design/atmosphere/AtmosphereProvider.jsx'
import SkyCanvas from './design/atmosphere/SkyCanvas.jsx'
import CursorAurora from './design/components/CursorAurora.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
)
