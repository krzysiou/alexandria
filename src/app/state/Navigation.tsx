import type { ReactNode } from 'react';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type BookTab = 'overview' | 'notes' | 'key-data' | 'tests';

type Route =
  | { name: 'library' }
  | { name: 'book'; bookId: string; tab: BookTab; doc?: string }
  | { name: 'test'; attemptId: string }
  | { name: 'settings' };

type NavigationValue = {
  route: Route;
  navigate: (route: Route) => void;
};

const NavigationContext = createContext<NavigationValue | null>(null);

/**
 * Minimal in-memory router: the app has a handful of screens and no URLs.
 */
const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [route, setRoute] = useState<Route>({ name: 'library' });
  const navigate = useCallback((next: Route) => {
    setRoute(next);
    document.querySelector('.main-scroll')?.scrollTo({ top: 0 });
  }, []);
  const value = useMemo(() => ({ route, navigate }), [route, navigate]);
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

/**
 * Current route and `navigate()`.
 */
const useNavigation = (): NavigationValue => {
  const value = useContext(NavigationContext);
  if (!value) {
    throw new Error('useNavigation must be used inside NavigationProvider');
  }
  return value;
};

export type { BookTab, Route };
export { NavigationProvider, useNavigation };
