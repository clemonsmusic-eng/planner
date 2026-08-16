import { useEffect, useState } from 'react';

/**
 * Whether a CSS media query currently matches.
 *
 * Layout is done in Tailwind wherever it can be, but a few behaviours — the
 * Schedule tab's drag-to-re-date, for one — only exist on the wide layout, and
 * a behaviour can't be switched on by a class. This is the same breakpoint,
 * read from the same place the stylesheet reads it.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** The `lg:` breakpoint — desktop and iPad in landscape. */
export const useIsWideLayout = () => useMediaQuery('(min-width: 1024px)');
