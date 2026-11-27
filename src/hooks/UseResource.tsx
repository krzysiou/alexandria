import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/services/tauri-bridge/commands';

type ResourceOptions = {
  keepPrevious?: boolean;
};

type Resource<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
};

/**
 * Loads data with `load` and reloads it whenever `key` changes or `reload()`
 * is called. Data stays visible while reloading. With `keepPrevious` it also
 * stays visible when `key` changes, until the new data has arrived, so the
 * layout never collapses into a loading state (used for documents).
 */
const useResource = <T,>(key: string, load: () => Promise<T>, options: ResourceOptions = {}): Resource<T> => {
  const loadRef = useRef(load);
  loadRef.current = load;
  const requestRef = useRef(0);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    try {
      const result = await loadRef.current();
      if (request === requestRef.current) {
        setData(result);
        setError(null);
      }
    } catch (caught) {
      if (request === requestRef.current) {
        setError(errorMessage(caught));
      }
    } finally {
      if (request === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const keepPrevious = options.keepPrevious ?? false;

  useEffect(() => {
    if (!keepPrevious) {
      setData(undefined);
    }
    void key;
    reload();
  }, [key, keepPrevious, reload]);

  return { data, error, loading, reload };
};

export type { Resource, ResourceOptions };
export { useResource };
