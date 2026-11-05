import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Root } from './app/Root'
import { TabLock } from './persistence/tabLock'
import { registerServiceWorker } from './app/pwa'
import { installAudio } from './audio/manager'

const tabLock = new TabLock()
void tabLock.start()
// Offline support and updates (production builds only).
registerServiceWorker()
// Sound starts after the first click or key press, and only if it is on.
installAudio()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root tabLock={tabLock} />
  </StrictMode>,
)
