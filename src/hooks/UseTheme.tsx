import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import type { ThemePreference } from '@/services/tauri-bridge/types';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Applies the theme preference to the document (`data-theme`) and to the
 * native window chrome, following the system setting when set to "system".
 */
const useTheme = (preference: ThemePreference): void => {
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const apply = () => {
      const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    getCurrentWindow()
      .setTheme(preference === 'system' ? null : preference)
      .catch(() => undefined);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);
};

export { useTheme };
