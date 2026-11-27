import type { ReactNode } from 'react';

import { useState } from 'react';
import { Download, FolderOpen, LogIn, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

import type { ClaudeConnection } from '@/hooks/UseClaudeConnection';
import type { MaintenanceAction, Settings, ThemePreference } from '@/services/tauri-bridge/types';

import { PlanUsage } from '@/components/plan-usage/PlanUsage';
import { Button } from '@/components/ui-kit/Button.styles';
import { ConfirmButton } from '@/components/ui-kit/ConfirmButton';
import { ErrorBanner, Spinner } from '@/components/ui-kit/Feedback';
import { Input, Segmented, Select } from '@/components/ui-kit/Form.styles';
import { Page, PageHeader, Row } from '@/components/ui-kit/Layout.styles';
import { Text } from '@/components/ui-kit/Text.styles';
import { useResource } from '@/hooks/UseResource';
import { FontPicker, PalettePicker } from '@/screens/settings/AppearancePickers';
import { MaintenanceOverlay } from '@/screens/settings/MaintenanceOverlay';
import {
  Footer,
  SettingControl,
  SettingLabel,
  SettingRow,
  SettingsCard,
  SettingText,
} from '@/screens/settings/SettingsScreen.styles';
import { api, errorMessage } from '@/services/tauri-bridge/commands';
import { modelOptions } from '@/utils/claude-models';
import { usd } from '@/utils/display-format';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const COST_CAPS = [1, 2, 3, 5, 10, 15, 20, 30, 50];

/**
 * Spending cap choices, including the current one when it was set elsewhere.
 */
const costCapOptions = (current: number): number[] =>
  COST_CAPS.includes(current) ? COST_CAPS : [...COST_CAPS, current].sort((a, b) => a - b);

/**
 * Inclusive list of integers, used for the numeric dropdowns.
 */
const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Labelled settings row with an optional hint under the label.
 */
const Setting = ({ label, hint, children }: { label: string; hint?: ReactNode; children?: ReactNode }) => (
  <SettingRow>
    <SettingText>
      <SettingLabel>{label}</SettingLabel>
      {hint ? (
        <Text $tone="muted" $size="sm">
          {hint}
        </Text>
      ) : null}
    </SettingText>
    {children ? <SettingControl>{children}</SettingControl> : null}
  </SettingRow>
);

/**
 * Dropdown of whole numbers bound to a numeric setting.
 */
const NumberSelect = ({
  value,
  from,
  to,
  onChange,
}: {
  value: number;
  from: number;
  to: number;
  onChange: (value: number) => void;
}) => (
  <Select value={value} onChange={event => onChange(Number(event.target.value))}>
    {range(from, to).map(option => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </Select>
);

type Props = {
  settings: Settings;
  onSettings: (settings: Settings) => Promise<void>;
  claude: ClaudeConnection;
};

/**
 * Appearance, Claude connection, parsing options, storage location and app
 * maintenance (update, reset, uninstall).
 */
const SettingsScreen = ({ settings, onSettings, claude }: Props) => {
  const info = useResource('app-info', api.appInfo);
  const [error, setError] = useState<string | null>(null);
  const [claudePath, setClaudePath] = useState(settings.claudePath);
  const [maintenance, setMaintenance] = useState<MaintenanceAction | null>(null);

  const status = claude.status;
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const update = (patch: Partial<Settings>) => run(() => onSettings({ ...settings, ...patch }));

  const maintain = (action: MaintenanceAction) =>
    run(async () => {
      await api.runMaintenance(action);
      setMaintenance(action);
    });

  const saveClaudePath = () =>
    run(async () => {
      await onSettings({ ...settings, claudePath });
      await claude.check();
    });

  const connectionHint = status?.installed
    ? [status.email ?? 'Signed in', status.subscription ? `${status.subscription} plan` : null, status.version]
        .filter(Boolean)
        .join(' · ')
    : (status?.error ?? undefined);

  return (
    <Page $width="narrow">
      <PageHeader data-tauri-drag-region>
        <div>
          <h1>Settings</h1>
          <Text as="p" $tone="muted">
            Everything Alexandria stores lives in {info.data?.dataDir ?? '~/.alexandria'}
          </Text>
        </div>
      </PageHeader>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <SettingsCard>
        <h2>Appearance</h2>
        <Setting label="Mode">
          <Segmented>
            {THEMES.map(theme => (
              <button
                key={theme.value}
                type="button"
                aria-pressed={settings.theme === theme.value}
                onClick={() => update({ theme: theme.value })}
              >
                {theme.label}
              </button>
            ))}
          </Segmented>
        </Setting>
        <Setting label="Font">
          <FontPicker value={settings.font} onChange={font => update({ font })} />
        </Setting>
        <Setting label="Color theme" hint="Each theme has a light and a dark version." />
        <PalettePicker value={settings.palette} onChange={palette => update({ palette })} />
      </SettingsCard>

      <SettingsCard>
        <h2>Claude</h2>
        <Setting label={status?.loggedIn ? 'Connected' : 'Not connected'} hint={connectionHint}>
          <Row>
            {status?.installed && !status.loggedIn ? (
              <Button $variant="primary" onClick={() => run(api.claudeLogin)}>
                <LogIn size={15} /> Sign in
              </Button>
            ) : null}
            <Button onClick={claude.check} disabled={claude.checking}>
              {claude.checking ? <Spinner size={15} /> : <RefreshCw size={15} />} Check
            </Button>
          </Row>
        </Setting>
        <Setting
          label="Plan usage"
          hint="As reported by the last Claude call. Parsing a book counts towards these limits."
        >
          <PlanUsage
            refreshKey={claude.checking ? 'checking' : 'idle'}
            weekly
            emptyText="Shown after the first book is parsed"
          />
        </Setting>
        <Setting label="Model" hint="Used only while parsing a new book. Notes and tests never use Claude.">
          <Select value={settings.model} onChange={event => update({ model: event.target.value })}>
            {modelOptions(settings.model).map(model => (
              <option key={model.value} value={model.value}>
                {model.name} — {model.description}
              </option>
            ))}
          </Select>
        </Setting>
        <Setting label="Claude Code location" hint="Leave empty to detect it automatically.">
          <Row $wrap={false}>
            <Input
              placeholder={status?.path ?? '/path/to/claude'}
              value={claudePath}
              onChange={event => setClaudePath(event.target.value)}
            />
            <Button disabled={claudePath === settings.claudePath} onClick={saveClaudePath}>
              Save
            </Button>
          </Row>
        </Setting>
      </SettingsCard>

      <SettingsCard>
        <h2>Parsing</h2>
        <Text $tone="muted" $size="sm">
          Applies to books you add or resume after changing it.
        </Text>
        <Setting label="Parallel sections" hint="Faster, but uses your plan's limits more quickly.">
          <NumberSelect
            value={settings.concurrency}
            from={1}
            to={6}
            onChange={concurrency => update({ concurrency })}
          />
        </Setting>
        <Setting label="Questions per section">
          <NumberSelect
            value={settings.questionsPerSection}
            from={3}
            to={20}
            onChange={questionsPerSection => update({ questionsPerSection })}
          />
        </Setting>
        <Setting
          label="Spending cap per book"
          hint="Parsing pauses before a book would cost more than this. Raise it and press Resume to continue."
        >
          <Select value={settings.maxCostUsd} onChange={event => update({ maxCostUsd: Number(event.target.value) })}>
            {costCapOptions(settings.maxCostUsd).map(value => (
              <option key={value} value={value}>
                {usd(value)}
              </option>
            ))}
          </Select>
        </Setting>
        <Setting label="Cross-chapter questions" hint="Questions about the book as a whole.">
          <NumberSelect
            value={settings.bookQuestions}
            from={0}
            to={30}
            onChange={bookQuestions => update({ bookQuestions })}
          />
        </Setting>
      </SettingsCard>

      <SettingsCard>
        <h2>Storage</h2>
        <Setting label="Data folder" hint={info.data?.dataDir}>
          <Button onClick={() => run(() => api.revealInFinder())}>
            <FolderOpen size={15} /> Show in Finder
          </Button>
        </Setting>
        <Setting label="Database" hint={info.data?.databasePath}>
          <Text $tone="muted" $size="sm">
            SQLite
          </Text>
        </Setting>
      </SettingsCard>

      <SettingsCard>
        <h2>Maintenance</h2>
        <Text $tone="muted" $size="sm">
          These run in the background. Alexandria shows their progress and restarts or closes itself when needed.
        </Text>
        <Setting
          label="Update"
          hint={
            info.data?.canUpdate
              ? `Rebuilds from ${info.data.sourceDir} (pulling the latest changes first) and reinstalls. Your library is kept.`
              : `The source code was not found at ${info.data?.sourceDir ?? 'its original location'}.`
          }
        >
          <ConfirmButton
            variant="default"
            onConfirm={() => maintain('update')}
            confirmLabel="Update now?"
            title="Update Alexandria"
          >
            <Download size={15} /> Update
          </ConfirmButton>
        </Setting>
        <Setting label="Reset data" hint="Deletes every book, note, test and setting. The app stays installed.">
          <ConfirmButton onConfirm={() => maintain('reset')} confirmLabel="Delete all data?">
            <RotateCcw size={15} /> Reset
          </ConfirmButton>
        </Setting>
        <Setting label="Uninstall" hint="Deletes all data and removes Alexandria from Applications.">
          <ConfirmButton onConfirm={() => maintain('uninstall')} confirmLabel="Uninstall Alexandria?">
            <Trash2 size={15} /> Uninstall
          </ConfirmButton>
        </Setting>
      </SettingsCard>

      <Footer>Alexandria {info.data?.version ?? ''}</Footer>

      {maintenance ? <MaintenanceOverlay action={maintenance} onClose={() => setMaintenance(null)} /> : null}
    </Page>
  );
};

export { SettingsScreen };
