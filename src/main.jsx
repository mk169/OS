import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { wendeAkzentAn, gespeicherterAkzent } from './lib/akzent'

// Akzentfarbe synchron vor dem ersten Rendern setzen – kein Farb-Flash.
wendeAkzentAn(gespeicherterAkzent())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
