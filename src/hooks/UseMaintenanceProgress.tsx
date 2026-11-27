import { useEffect, useState } from 'react';

import type { MaintenanceProgress } from '@/services/tauri-bridge/types';

import { api } from '@/services/tauri-bridge/commands';

const POLL_MS = 1000;

/**
 * Polls the progress of a running update, reset or uninstall while `active`.
 */
const useMaintenanceProgress = (active: boolean): MaintenanceProgress | null => {
  const [progress, setProgress] = useState<MaintenanceProgress | null>(null);

  useEffect(() => {
    if (!active) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const next = await api.maintenanceProgress();
        if (!cancelled) {
          setProgress(next);
        }
      } catch {
        return;
      }
    };

    poll();
    const timer = window.setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active]);

  return progress;
};

export { useMaintenanceProgress };
