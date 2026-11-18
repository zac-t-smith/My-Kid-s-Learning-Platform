import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { getState, initStore, update } from './db/store'
import { SKILLS } from './skills/manifest'
import { initSync } from './sync/sync'

registerSW({ immediate: true })
// Automated tests only: lets a test mark skills as known without playing hundreds of rounds.
if ((window as unknown as { __E2E__?: boolean }).__E2E__) Object.assign(window, { __store: { getState, update, skills: SKILLS.map((s) => s.id) } })
void initStore().then(initSync)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
