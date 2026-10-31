import { useSyncExternalStore } from 'react'
import type { TabLock } from '../persistence/tabLock'
import { OtherTabScreen } from '../ui/OtherTabScreen'
import { App } from './App'
import { startAppSession } from './lifecycle'

/** Shows the app only in the tab that owns the tab lock. */
export function Root({ tabLock }: { tabLock: TabLock }) {
  const state = useSyncExternalStore(tabLock.subscribe, tabLock.getState)

  if (state !== 'owner') {
    return <OtherTabScreen state={state} onUseHere={() => void tabLock.takeOver()} />
  }
  return <App session={startAppSession()} tabLock={tabLock} />
}
