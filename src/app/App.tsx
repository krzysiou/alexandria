import { Splash } from '@/app/App.styles';
import { AppShell } from '@/app/AppShell';
import { ImportsProvider } from '@/app/state/Imports';
import { NavigationProvider } from '@/app/state/Navigation';
import { DEFAULT_FONT, findFont } from '@/app/theme/fonts';
import { GlobalStyles } from '@/app/theme/GlobalStyles';
import { DEFAULT_PALETTE, findPalette } from '@/app/theme/palettes';
import { Spinner } from '@/components/ui-kit/Feedback';
import { Text } from '@/components/ui-kit/Text.styles';
import { useClaudeConnection } from '@/hooks/UseClaudeConnection';
import { useSettings } from '@/hooks/UseSettings';
import { useTheme } from '@/hooks/UseTheme';
import logo from '@/resources/icon.svg';
import { SetupScreen } from '@/screens/claude-setup/SetupScreen';

/**
 * Root component: loads settings, applies the theme, and keeps the app behind
 * the setup screen until Claude Code is installed and signed in.
 */
const App = () => {
  const { settings, error, save } = useSettings();
  const claude = useClaudeConnection();
  useTheme(settings?.theme ?? 'system');

  const content = (() => {
    if (error) {
      return (
        <Splash>
          <img src={logo} alt="" />
          <Text $tone="danger">{error}</Text>
        </Splash>
      );
    }

    if (!settings || !claude.status) {
      return (
        <Splash data-tauri-drag-region>
          <img src={logo} alt="" />
          <Text $tone="muted" $size="sm">
            <Spinner size={13} /> Connecting to Claude…
          </Text>
        </Splash>
      );
    }

    if (!claude.ready) {
      return (
        <SetupScreen
          status={claude.status}
          checking={claude.checking}
          settings={settings}
          onCheck={claude.check}
          onSettings={save}
        />
      );
    }

    return (
      <NavigationProvider>
        <ImportsProvider>
          <AppShell settings={settings} onSettings={save} claude={claude} />
        </ImportsProvider>
      </NavigationProvider>
    );
  })();

  return (
    <>
      <GlobalStyles
        $palette={findPalette(settings?.palette ?? DEFAULT_PALETTE)}
        $readingFont={findFont(settings?.font ?? DEFAULT_FONT).serif}
        $uiFont={findFont(settings?.font ?? DEFAULT_FONT).sans}
      />
      {content}
    </>
  );
};

export { App };
