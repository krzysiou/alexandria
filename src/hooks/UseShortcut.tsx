import { useEffect, useRef } from 'react';

/**
 * Runs `handler` when a key event matches `matches`, ignoring keys typed into
 * text fields. The handler may change between renders without re-subscribing.
 */
const useShortcut = (matches: (event: KeyboardEvent) => boolean, handler: () => void): void => {
  const matchesRef = useRef(matches);
  const handlerRef = useRef(handler);
  matchesRef.current = matches;
  handlerRef.current = handler;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (typing || !matchesRef.current(event)) {
        return;
      }

      event.preventDefault();
      handlerRef.current();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};

export { useShortcut };
