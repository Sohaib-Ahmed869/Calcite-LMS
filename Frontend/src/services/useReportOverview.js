import { useCallback, useEffect, useRef, useState } from 'react';
import { ReportService } from './report.service';

/**
 * Shared, cached access to the admin analytics overview (`/reports/overview`).
 *
 * Both the Dashboard and the Reports page render from this single payload, so we keep it in a
 * module-level cache and follow a stale-while-revalidate policy:
 *   • first ever read  → fetch (shows the page loader), then cache
 *   • read within TTL  → served straight from cache, NO network call
 *   • read after TTL   → cached data shown instantly, revalidated silently in the background
 *   • refetch()        → always hits the network (the Refresh button) and refreshes the cache
 *
 * Concurrent callers share one in-flight request, so navigating Dashboard ⇄ Reports never fires
 * duplicate requests. The cache lives for the session (cleared on a full reload).
 */
const TTL = 5 * 60 * 1000; // 5 minutes — within normal navigation this means zero refetches.

let cache = null; // { data, ts }
let inflight = null; // shared promise that dedupes concurrent fetches

const isFresh = () => cache && Date.now() - cache.ts < TTL;

function fetchOverview(force) {
  if (!force && isFresh()) return Promise.resolve(cache.data);
  if (inflight) return inflight; // a fetch is already running — reuse it
  inflight = ReportService.overview()
    .then((data) => {
      cache = { data, ts: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Invalidate the cache (e.g. after a mutation that changes the analytics). */
export function invalidateReportOverview() {
  cache = null;
}

export function useReportOverview(enabled = true) {
  const [data, setData] = useState(() => cache?.data ?? null);
  const [loading, setLoading] = useState(() => enabled && !cache);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const run = useCallback(
    (force) => {
      if (!enabled) return;
      // Fresh cache and not a forced refresh → render it and skip the network entirely.
      if (!force && isFresh()) {
        setData(cache.data);
        setLoading(false);
        return;
      }
      setLoading(true); // first load shows the page loader; a revalidation just spins Refresh (data stays)
      fetchOverview(force)
        .then((d) => {
          if (!alive.current) return;
          setData(d);
          setError(null);
        })
        .catch((e) => {
          if (alive.current && !cache) setError(e); // keep showing cached data if a revalidation fails
        })
        .finally(() => {
          if (alive.current) setLoading(false);
        });
    },
    [enabled],
  );

  useEffect(() => {
    alive.current = true;
    run(false);
    return () => {
      alive.current = false;
    };
  }, [run]);

  const refetch = useCallback(() => run(true), [run]);

  return { data, loading, error, refetch };
}

export default useReportOverview;
