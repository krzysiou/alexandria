import { useCallback, useEffect, useState } from 'react';

import type { Settings } from '@/services/tauri-bridge/types';

import { api, errorMessage } from '@/services/tauri-bridge/commands';

type SettingsState = {
  settings: Settings | null;
  error: string | null;
  save: (settings: Settings) => Promise<void>;
};

/**
 * Loads the settings stored in ~/.alexandria and saves changes optimistically.
 */
const useSettings = (): SettingsState => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch(caught => setError(errorMessage(caught)));
  }, []);

  const save = useCallback(async (next: Settings) => {
    setSettings(next);
    setSettings(await api.saveSettings(next));
  }, []);

  return { settings, error, save };
};

export type { SettingsState };
export { useSettings };
