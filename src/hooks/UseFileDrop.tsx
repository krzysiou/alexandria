import { useEffect, useState } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/**
 * Listens for files dragged onto the window. Returns whether something is
 * being dragged over it and calls `onDrop` with the dropped file paths.
 */
const useFileDrop = (onDrop: (paths: string[]) => void): boolean => {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent(event => {
        const { type } = event.payload;

        if (type === 'enter' || type === 'over') {
          setDragging(true);
          return;
        }

        setDragging(false);
        if (event.payload.type === 'drop') {
          onDrop(event.payload.paths);
        }
      })
      .then(stop => {
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
  }, [onDrop]);

  return dragging;
};

export { useFileDrop };
