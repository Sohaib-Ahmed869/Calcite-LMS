import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Lightweight breadcrumb trail. Pages may publish a custom trail via `useBreadcrumbs([...])`;
 * the Header reads it with `useBreadcrumbTrail()` and falls back to the route title when empty.
 * Trail items: { label, to? } — the last item renders as plain text.
 */
const BreadcrumbContext = createContext(null);

export function BreadcrumbProvider({ children }) {
  const [trail, setTrail] = useState([]);
  const value = useMemo(() => ({ trail, setTrail }), [trail]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbTrail() {
  const ctx = useContext(BreadcrumbContext);
  return ctx?.trail || [];
}

/** Publish a breadcrumb trail for the current page; clears it on unmount. */
export function useBreadcrumbs(items) {
  const ctx = useContext(BreadcrumbContext);
  const setTrail = ctx?.setTrail;
  const serialized = JSON.stringify(items || []);
  useEffect(() => {
    if (!setTrail) return undefined;
    setTrail(items || []);
    return () => setTrail([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, setTrail]);
}

export default BreadcrumbProvider;
