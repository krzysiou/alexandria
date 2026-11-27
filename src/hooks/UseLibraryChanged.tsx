import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';

import { LIBRARY_CHANGED } from '@/services/tauri-bridge/events';

/**
 * Calls `handler(bookId)` whenever the backend reports a change to a book,
 * its parsing progress or its tests.
 */
const useLibraryChanged = (handler: (bookId: string) => void): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    listen<string>(LIBRARY_CHANGED, event => handlerRef.current(event.payload)).then(stop => {
      if (disposed) {
        stop();
      } else {
        unlisten = stop;
      }
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
};

export { useLibraryChanged };
