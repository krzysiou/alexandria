import { useCallback, useEffect, useRef, useState } from 'react';

import type { ClaudeStatus } from '@/services/tauri-bridge/types';

import { api, errorMessage } from '@/services/tauri-bridge/commands';

const RECHECK_MS = 4000;

type ClaudeConnection = {
  status: ClaudeStatus | null;
  ready: boolean;
  checking: boolean;
  check: () => Promise<void>;
};

/**
 * Builds a "not installed" status carrying the error that prevented the check.
 */
const failedStatus = (error: unknown): ClaudeStatus => ({
  installed: false,
  path: null,
  version: null,
  loggedIn: false,
  email: null,
  authMethod: null,
  subscription: null,
  error: errorMessage(error),
});

/**
 * Checks on startup whether Claude Code is installed and signed in. Until it
 * is, it re-checks every few seconds so the setup screen advances on its own.
 * Once ready it stays ready for the session.
 */
const useClaudeConnection = (): ClaudeConnection => {
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;
    setChecking(true);

    try {
      const next = await api.claudeStatus();
      setStatus(next);
      if (next.installed && next.loggedIn) {
        setReady(true);
      }
    } catch (caught) {
      setStatus(failedStatus(caught));
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (ready || !status) {
      return;
    }

    const timer = window.setInterval(check, RECHECK_MS);
    return () => window.clearInterval(timer);
  }, [ready, status, check]);

  return { status, ready, checking, check };
};

export type { ClaudeConnection };
export { useClaudeConnection };
