import { useState } from 'react';
import { Check, Download, ExternalLink, LogIn, RefreshCw } from 'lucide-react';

import type { ClaudeStatus, Settings } from '@/services/tauri-bridge/types';

import { Button } from '@/components/ui-kit/Button.styles';
import { Spinner } from '@/components/ui-kit/Feedback';
import { Input } from '@/components/ui-kit/Form.styles';
import { Row } from '@/components/ui-kit/Layout.styles';
import { Text } from '@/components/ui-kit/Text.styles';
import logo from '@/resources/icon.svg';
import {
  Advanced,
  Backdrop,
  ErrorText,
  Footer,
  Lead,
  Logo,
  Panel,
  Step,
  StepBody,
  StepMark,
  Steps,
} from '@/screens/claude-setup/SetupScreen.styles';
import { api, errorMessage } from '@/services/tauri-bridge/commands';

const INSTALL_DOCS = 'https://docs.claude.com/en/docs/claude-code/setup';

type Props = {
  status: ClaudeStatus | null;
  checking: boolean;
  settings: Settings;
  onCheck: () => void;
  onSettings: (settings: Settings) => Promise<void>;
};

/**
 * Shown on startup only when Claude Code is missing or not signed in.
 * The app re-checks every few seconds, so finishing the sign-in in Terminal
 * is enough to continue.
 */
const SetupScreen = ({ status, checking, settings, onCheck, onSettings }: Props) => {
  const [customPath, setCustomPath] = useState(settings.claudePath);
  const [error, setError] = useState<string | null>(null);

  const installed = status?.installed ?? false;
  const loggedIn = status?.loggedIn ?? false;

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const saveCustomPath = () =>
    run(async () => {
      await onSettings({ ...settings, claudePath: customPath });
      onCheck();
    });

  return (
    <Backdrop data-tauri-drag-region>
      <Panel>
        <Logo src={logo} alt="" />
        <h1>Welcome to Alexandria</h1>
        <Lead>
          Alexandria reads your books once with Claude and turns them into key data, structured notes and tests you can
          study offline. It uses your own Claude account through Claude Code.
        </Lead>

        <Steps>
          <Step $state={installed ? 'done' : 'current'}>
            <StepMark $done={installed}>{installed ? <Check size={14} /> : 1}</StepMark>
            <StepBody>
              <h3>Install Claude Code</h3>
              {installed ? (
                <Text $tone="muted">
                  Found <code>{status?.path}</code>
                  {status?.version ? ` · ${status.version}` : ''}
                </Text>
              ) : (
                <>
                  <Text $tone="muted">
                    Claude Code is the command-line tool Alexandria uses to talk to Claude. Install it with the official
                    installer; it opens in Terminal.
                  </Text>
                  <Row>
                    <Button $variant="primary" onClick={() => run(api.claudeInstall)}>
                      <Download size={15} /> Install Claude Code
                    </Button>
                    <Button $variant="ghost" onClick={() => run(() => api.openExternal(INSTALL_DOCS))}>
                      <ExternalLink size={15} /> Other ways to install
                    </Button>
                  </Row>
                  <Advanced>
                    <summary>Already installed somewhere else?</summary>
                    <Row $wrap={false}>
                      <Input
                        placeholder="/path/to/claude"
                        value={customPath}
                        onChange={event => setCustomPath(event.target.value)}
                      />
                      <Button onClick={saveCustomPath}>Use this path</Button>
                    </Row>
                  </Advanced>
                </>
              )}
            </StepBody>
          </Step>

          <Step $state={loggedIn ? 'done' : installed ? 'current' : 'upcoming'}>
            <StepMark $done={loggedIn}>{loggedIn ? <Check size={14} /> : 2}</StepMark>
            <StepBody>
              <h3>Sign in to Claude</h3>
              {loggedIn ? (
                <Text $tone="muted">Signed in{status?.email ? ` as ${status.email}` : ''}.</Text>
              ) : (
                <>
                  <Text $tone="muted">
                    Sign in with your Claude subscription or an Anthropic Console account. A Terminal window opens and
                    guides you through it in the browser.
                  </Text>
                  <Row>
                    <Button $variant="primary" disabled={!installed} onClick={() => run(api.claudeLogin)}>
                      <LogIn size={15} /> Sign in
                    </Button>
                  </Row>
                </>
              )}
            </StepBody>
          </Step>
        </Steps>

        {installed && status?.error ? <ErrorText>{status.error}</ErrorText> : null}
        {error ? <ErrorText>{error}</ErrorText> : null}

        <Footer>
          <Text $tone="muted" $size="sm">
            {checking ? (
              <>
                <Spinner size={13} /> Checking…
              </>
            ) : (
              'Checks automatically every few seconds.'
            )}
          </Text>
          <Button $variant="ghost" $size="sm" onClick={onCheck} disabled={checking}>
            <RefreshCw size={14} /> Check again
          </Button>
        </Footer>
      </Panel>
    </Backdrop>
  );
};

export { SetupScreen };
