import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = () => setMatches(mql.matches);
    listener();
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Sidebar becomes an off-canvas drawer, multi-column grids collapse to one column.
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

// Wider than mobile but still tight — used to step 4-column grids down to 2 instead of 1.
export function useIsTablet(): boolean {
  return useMediaQuery('(max-width: 1024px)');
}
