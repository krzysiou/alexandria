import { FileUp, PanelLeftOpen } from 'lucide-react';

import type { ClaudeConnection } from '@/hooks/UseClaudeConnection';
import type { Settings } from '@/services/tauri-bridge/types';

import {
  DragStrip,
  DropCard,
  DropOverlay,
  Main,
  MainScroll,
  Shell,
  ShowSidebarButton,
  SidebarSlot,
} from '@/app/AppShell.styles';
import { useImports } from '@/app/state/Imports';
import { useNavigation } from '@/app/state/Navigation';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Text } from '@/components/ui-kit/Text.styles';
import { useFileDrop } from '@/hooks/UseFileDrop';
import { useShortcut } from '@/hooks/UseShortcut';
import { BookScreen } from '@/screens/book-detail/BookScreen';
import { LibraryScreen } from '@/screens/library/LibraryScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { TestScreen } from '@/screens/test-session/TestScreen';
import { MAIN_SCROLL_ID } from '@/utils/scroll';

type Props = {
  settings: Settings;
  onSettings: (settings: Settings) => Promise<void>;
  claude: ClaudeConnection;
};

/**
 * The screen matching the current route.
 */
const CurrentScreen = ({ settings, onSettings, claude }: Props) => {
  const { route } = useNavigation();

  switch (route.name) {
    case 'library':
      return <LibraryScreen />;
    case 'book':
      return <BookScreen key={route.bookId} bookId={route.bookId} tab={route.tab} doc={route.doc} />;
    case 'test':
      return <TestScreen key={route.attemptId} attemptId={route.attemptId} />;
    case 'settings':
      return <SettingsScreen settings={settings} onSettings={onSettings} claude={claude} />;
  }
};

/**
 * Main window once Claude is ready: sidebar, current screen and the overlay
 * shown while PDFs are dragged over the window.
 */
const AppShell = ({ settings, onSettings, claude }: Props) => {
  const { importFiles } = useImports();
  const dragging = useFileDrop(importFiles);
  const hidden = settings.sidebarHidden;

  const toggleSidebar = () => onSettings({ ...settings, sidebarHidden: !hidden });

  useShortcut(
    event =>
      (event.metaKey && event.key === '\\') || (event.metaKey && event.ctrlKey && event.key.toLowerCase() === 's'),
    toggleSidebar,
  );

  return (
    <Shell $sidebarHidden={hidden}>
      <SidebarSlot aria-hidden={hidden}>
        <Sidebar theme={settings.theme} onTheme={theme => onSettings({ ...settings, theme })} onHide={toggleSidebar} />
      </SidebarSlot>

      <Main>
        <DragStrip data-tauri-drag-region />
        <MainScroll id={MAIN_SCROLL_ID}>
          <CurrentScreen settings={settings} onSettings={onSettings} claude={claude} />
        </MainScroll>
      </Main>

      {hidden ? (
        <ShowSidebarButton onClick={toggleSidebar} title="Show sidebar" aria-label="Show sidebar">
          <PanelLeftOpen size={17} />
        </ShowSidebarButton>
      ) : null}

      {dragging ? (
        <DropOverlay>
          <DropCard>
            <FileUp size={36} />
            <h2>Drop to add to your library</h2>
            <Text $tone="muted">PDF files only</Text>
          </DropCard>
        </DropOverlay>
      ) : null}
    </Shell>
  );
};

export { AppShell };
