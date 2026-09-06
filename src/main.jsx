import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Fehlergrenze from './components/Fehlergrenze.jsx'
import { wendeAkzentAn, gespeicherterAkzent } from './lib/akzent'
import { wendeModusAn, gespeicherterLockedInModus } from './lib/lockedin'

// Fokus-Modus und Akzentfarbe synchron vor dem ersten Rendern setzen – sonst
// blitzt bei laufendem Locked In kurz das helle Layout auf.
const lockedIn = gespeicherterLockedInModus()
wendeModusAn(lockedIn)
wendeAkzentAn(gespeicherterAkzent(), lockedIn)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Fehlergrenze>
      <App />
    </Fehlergrenze>
  </StrictMode>,
)
