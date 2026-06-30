import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Session-scoped cache shared by every `useApi({ cacheKey })` caller and the imperative helpers
 * below (`cachedFetch` / `peekCache`). Kept OUTSIDE React so it survives unmount/remount — that's
 * what lets a revisited page render instantly from cache instead of flashing a loader.
 *
 * Each entry is `{ data, ts }`. Reads within `TTL` are served straight from here with NO network
 * call; after the TTL the stale value is shown immediately and revalidated in the background.
 */
const cacheStore = new Map(); // key → { data, ts }
const inflight = new Map(); // key → Promise (dedupes concurrent fetches for the same key)
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

const isFresh = (entry, ttl) => !!entry && Date.now() - entry.ts < ttl;

/** Synchronously read fresh cached data for `key`, or `null` if missing/stale. */
export function peekCache(key, ttl = DEFAULT_TTL) {
  const entry = cacheStore.get(key);
  return isFresh(entry, ttl) ? entry.data : null;
}

/**
 * Promise-returning cached fetch. Fresh cache → resolves immediately (no network); otherwise runs
 * `fetcher`, stores the result and resolves it. Concurrent callers share one in-flight request.
 */
export function cachedFetch(key, fetcher, { ttl = DEFAULT_TTL, force = false } = {}) {
  if (!force) {
    const entry = cacheStore.get(key);
    if (isFresh(entry, ttl)) return Promise.resolve(entry.data);
    if (inflight.has(key)) return inflight.get(key);
  }
  const p = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      cacheStore.set(key, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/** Drop a cache entry (or the whole cache) so the next read refetches. */
export function invalidateCache(key) {
  if (key == null) cacheStore.clear();
  else cacheStore.delete(key);
}

/**
 * Run an async fetcher and track { data, loading, error }. Re-runs when `deps` change; `refetch()`
 * re-runs on demand. A monotonic request id guards against races — only the most recent call wins.
 * `mutate()` patches the data in place (and the cache) for optimistic UI updates.
 *
 * Pass `options.cacheKey` for stale-while-revalidate behaviour: the page mounts straight into the
 * cached data (no loader), and within `options.ttl` (default 5 min) it won't hit the network at all;
 * once stale it revalidates in the background. `refetch()` always forces a fresh request.
 */
export function useApi(fetcher, deps = [], options = {}) {
  const { cacheKey, ttl = DEFAULT_TTL } = options;
  const [state, setState] = useState(() => ({
    data: cacheKey ? peekCache(cacheKey, Infinity) : null, // seed from cache even if stale (SWR)
    loading: cacheKey ? !cacheStore.has(cacheKey) : true,
    error: null,
  }));
  const fnRef = useRef(fetcher);
  fnRef.current = fetcher;
  const keyRef = useRef(cacheKey);
  keyRef.current = cacheKey;
  const reqId = useRef(0);

  const load = useCallback(
    (force = false) => {
      const key = keyRef.current;
      const id = ++reqId.current;

      // Fresh cache and not a forced refresh → render it and skip the network entirely.
      if (key && !force && isFresh(cacheStore.get(key), ttl)) {
        setState({ data: cacheStore.get(key).data, loading: false, error: null });
        return;
      }

      // Keep any current data on screen (the `loading && !data` loader guard stays false on revisit,
      // so only an explicit Refresh spins while a background revalidation runs).
      setState((s) => ({ ...s, loading: true, error: null }));

      const run = key
        ? cachedFetch(key, () => fnRef.current(), { ttl, force })
        : Promise.resolve().then(() => fnRef.current());

      run
        .then((data) => {
          if (id === reqId.current) setState({ data, loading: false, error: null });
        })
        .catch((error) => {
          // Keep whatever is on screen so a failed background revalidation doesn't blank the page.
          if (id === reqId.current) setState((s) => ({ data: s.data, loading: false, error }));
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [ttl, ...deps],
  );

  useEffect(() => {
    load(false);
    // Invalidate any in-flight request on unmount / deps change so it can't write stale state.
    return () => {
      reqId.current += 1;
    };
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  // Patch data without a round-trip. Accepts a new value or an updater(prev) => next. Writes through
  // to the cache (keeping its timestamp) so an optimistic edit survives navigation.
  const mutate = useCallback((updater) => {
    setState((s) => {
      const data = typeof updater === 'function' ? updater(s.data) : updater;
      const key = keyRef.current;
      if (key) {
        const entry = cacheStore.get(key);
        cacheStore.set(key, { data, ts: entry?.ts ?? Date.now() });
      }
      return { ...s, data };
    });
  }, []);

  return { ...state, refetch, mutate };
}

export default useApi;
