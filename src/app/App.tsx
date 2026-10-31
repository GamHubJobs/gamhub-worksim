/**
 * The app once this tab owns the editor: loads the player's career and shows
 * either the first-day screen or the desktop. Also owns storage health,
 * backups and saving before another tab takes over.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Desktop } from '../desktop/Desktop'
import { Onboarding } from '../desktop/Onboarding'
import {
  getBackupStatus,
  snoozeBackupReminder,
  type BackupStatus,
} from '../persistence/backup'
import type { SessionStart } from '../persistence/session'
import {
  checkStorageHealth,
  isIndexedDbUsable,
  requestPersistentStorage,
  type StorageHealth,
} from '../persistence/storageHealth'
import type { TabLock } from '../persistence/tabLock'
import { BackupReminder } from '../ui/BackupReminder'
import { StoragePanel } from '../ui/StoragePanel'
import { handOverAppSession } from './lifecycle'
import { AppServicesContext, type AppServices } from './services'
import { useCareer } from './useCareer'

const STORAGE_BLOCKED_MESSAGE =
  "Your browser is not allowing WorkSim to store data, so your work can't be saved. " +
  'Check that cookies and site data are allowed for this site in your browser settings, ' +
  'then reload the page.'

interface AppProps {
  session: SessionStart
  tabLock: TabLock
}

export function App({ session, tabLock }: AppProps) {
  const career = useCareer()
  const [storageOpen, setStorageOpen] = useState(false)
  const [health, setHealth] = useState<StorageHealth | null>(null)
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)

  const refreshStorageInfo = useCallback(() => {
    void checkStorageHealth().then(setHealth)
    void getBackupStatus()
      .then(setBackupStatus)
      .catch(() => setBackupStatus(null))
  }, [])

  useEffect(refreshStorageInfo, [refreshStorageInfo])

  useEffect(() => {
    if (career.state.status !== 'error') return
    const message = career.state.message
    void isIndexedDbUsable().then((usable) =>
      setFatalError(usable ? message : STORAGE_BLOCKED_MESSAGE),
    )
  }, [career.state])

  // Everything that holds unsaved work registers here, so it can be saved
  // before a backup or before another tab takes over.
  const flushers = useRef(new Set<() => Promise<boolean>>())
  const flushAll = useCallback(async () => {
    const results = await Promise.all([...flushers.current].map((flush) => flush()))
    return results.every(Boolean)
  }, [])

  useEffect(() => {
    tabLock.setBeforeRelease(async () => {
      await flushAll()
      handOverAppSession()
    })
  }, [tabLock, flushAll])

  // After the first real save, ask the browser to protect our storage.
  const persistenceRequested = useRef(false)
  const onSaved = useCallback(() => {
    if (persistenceRequested.current) return
    persistenceRequested.current = true
    void requestPersistentStorage().then(refreshStorageInfo)
  }, [refreshStorageInfo])

  const services = useMemo<AppServices>(
    () => ({
      session,
      registerFlush: (flush) => {
        flushers.current.add(flush)
        return () => flushers.current.delete(flush)
      },
      onSaved,
    }),
    [session, onSaved],
  )

  const storageWarning =
    health?.lowSpace || health?.restrictedQuota || backupStatus?.reminderDue || false

  if (fatalError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div
          role="alert"
          className="max-w-xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-800"
        >
          <p className="font-semibold">GamHub WorkSim could not open your saved data.</p>
          <p className="mt-2 text-sm whitespace-pre-wrap">{fatalError}</p>
        </div>
      </div>
    )
  }

  return (
    <AppServicesContext.Provider value={services}>
      {backupStatus?.reminderDue && career.state.status === 'ready' && (
        <div className="fixed inset-x-0 bottom-0 z-40 shadow-lg">
          <BackupReminder
            onOpenBackup={() => setStorageOpen(true)}
            onSnooze={() => void snoozeBackupReminder().then(refreshStorageInfo)}
          />
        </div>
      )}

      {career.state.status === 'loading' && (
        <p className="p-6 text-slate-500">Opening GamHub WorkSim…</p>
      )}
      {career.state.status === 'new' && (
        <Onboarding
          onStart={async (name) => {
            await career.createCareer(name)
            onSaved()
          }}
        />
      )}
      {career.state.status === 'ready' && (
        <Desktop
          profile={career.state.profile}
          career={career}
          storageWarning={storageWarning}
          onOpenStorage={() => {
            refreshStorageInfo()
            setStorageOpen(true)
          }}
        />
      )}

      {storageOpen && (
        <StoragePanel
          health={health}
          backupStatus={backupStatus}
          beforeBackup={flushAll}
          onBackupDone={refreshStorageInfo}
          onClose={() => setStorageOpen(false)}
        />
      )}
    </AppServicesContext.Provider>
  )
}
