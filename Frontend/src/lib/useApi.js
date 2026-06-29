import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async fetcher and track { data, loading, error }. Re-runs when `deps` change; `refetch()`
 * re-runs on demand. Ignores results from stale calls so fast deps changes don't clobber state.
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fetcher);
  fnRef.current = fetcher;

  const load = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(() => fnRef.current())
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(load, [load]);

  const refetch = useCallback(() => load(), [load]);
  return { ...state, refetch };
}

export default useApi;
