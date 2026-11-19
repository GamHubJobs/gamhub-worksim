/** A search across the job feeds from the app: loading, the adverts, each source's state. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { searchJobs, type SearchResult } from '../../jobs/search'
import type { JobQuery } from '../../jobs/types'

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; previous?: SearchResult }
  | { status: 'ready'; result: SearchResult }

export function useJobSearch(query: JobQuery | null) {
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const run = useRef(0)
  const key = query ? JSON.stringify(query) : ''

  const go = useCallback(
    (fresh: boolean) => {
      if (!query) return
      const mine = ++run.current
      setState((s) => ({
        status: 'loading',
        previous:
          s.status === 'ready'
            ? s.result
            : s.status === 'loading'
              ? s.previous
              : undefined,
      }))
      searchJobs(query, {
        fresh,
        // What has come in so far, while slower sources answer.
        onPartial: (partial) => {
          if (run.current === mine) setState({ status: 'loading', previous: partial })
        },
      }).then(
        (result) => {
          if (run.current === mine) setState({ status: 'ready', result })
        },
        () => {
          if (run.current === mine)
            setState({ status: 'ready', result: { listings: [], sources: [] } })
        },
      )
    },
    // The query by its contents, not its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  useEffect(() => {
    go(false)
  }, [go])

  return { state, refresh: () => go(true) }
}
