import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Inter font is bundled with the app (works offline too)
import '@fontsource-variable/inter'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
