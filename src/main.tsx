import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Root } from './app/Root'
import { TabLock } from './persistence/tabLock'

const tabLock = new TabLock()
void tabLock.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root tabLock={tabLock} />
  </StrictMode>,
)
