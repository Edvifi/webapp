import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import App from './App.tsx'
import { initErrorTracking } from './lib/errorTracking'

import { markBoot } from './lib/bootTiming'

// Before anything renders, so the session figure includes the client booting.
markBoot('app-start')

// Before render, so a crash during the first paint is still caught.
initErrorTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
