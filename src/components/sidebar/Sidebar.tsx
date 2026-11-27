import { Library, Monitor, Moon, PanelLeftClose, Settings as SettingsIcon, Sun } from 'lucide-react';

import type { ThemePreference } from '@/services/tauri-bridge/types';

import { useNavigation } from '@/app/state/Navigation';
import {
  Aside,
  BookItem,
  BookMeta,
  Books,
  BookText,
  BookTitle,
  Brand,
  BrandName,
  Footer,
  FooterNavItem,
  FooterRow,
  Hint,
  NavItem,
  NavList,
  Section,
  SectionHeading,
} from '@/components/sidebar/Sidebar.styles';
import { BookCover } from '@/components/ui-kit/BookCover';
import { IconButton } from '@/components/ui-kit/Button.styles';
import { ProgressBar } from '@/components/ui-kit/Feedback';
import { useLibraryChanged } from '@/hooks/UseLibraryChanged';
import { useResource } from '@/hooks/UseResource';
import logo from '@/resources/icon.svg';
import { api } from '@/services/tauri-bridge/commands';
import { parseProgress } from '@/utils/display-format';

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const THEME_ICON = {
  system: <Monitor size={16} />,
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
};

type Props = {
  theme: ThemePreference;
  onTheme: (theme: ThemePreference) => void;
  onHide: () => void;
};

/**
 * Left navigation: library, books with live parsing progress and, at the
 * bottom, settings, the theme switch and the hide button. The
 * brand strip doubles as the window drag area.
 */
const Sidebar = ({ theme, onTheme, onHide }: Props) => {
  const { route, navigate } = useNavigation();
  const books = useResource('sidebar-books', api.listBooks);
  useLibraryChanged(() => books.reload());

  const activeBook = route.name === 'book' ? route.bookId : null;

  return (
    <Aside>
      <Brand data-tauri-drag-region>
        <img src={logo} alt="" data-tauri-drag-region />
        <BrandName data-tauri-drag-region>Alexandria</BrandName>
      </Brand>

      <NavList>
        <NavItem $active={route.name === 'library'} onClick={() => navigate({ name: 'library' })}>
          <Library size={17} /> Library
        </NavItem>
      </NavList>

      <Section>
        <SectionHeading>Books</SectionHeading>
        <Books>
          {(books.data ?? []).map(book => (
            <BookItem
              key={book.id}
              $active={activeBook === book.id}
              onClick={() => navigate({ name: 'book', bookId: book.id, tab: 'overview' })}
              title={book.title}
            >
              <BookCover book={book} size="sm" />
              <BookText>
                <BookTitle>{book.title}</BookTitle>
                {book.status === 'ready' ? (
                  <BookMeta>{book.author ?? `${book.pageCount} pages`}</BookMeta>
                ) : (
                  <ProgressBar
                    value={parseProgress(book.sectionsDone, book.sectionsTotal, book.stage)}
                    tone={book.status === 'failed' ? 'gold' : 'accent'}
                  />
                )}
              </BookText>
            </BookItem>
          ))}

          {books.data?.length === 0 ? <Hint>Books you add appear here.</Hint> : null}
        </Books>
      </Section>

      <Footer>
        <FooterRow>
          <FooterNavItem $active={route.name === 'settings'} onClick={() => navigate({ name: 'settings' })}>
            <SettingsIcon size={17} /> Settings
          </FooterNavItem>
          <IconButton
            onClick={() => onTheme(NEXT_THEME[theme])}
            title={`Theme: ${theme}`}
            aria-label={`Theme: ${theme}`}
          >
            {THEME_ICON[theme]}
          </IconButton>
          <IconButton onClick={onHide} title="Hide sidebar" aria-label="Hide sidebar">
            <PanelLeftClose size={17} />
          </IconButton>
        </FooterRow>
      </Footer>
    </Aside>
  );
};

export { Sidebar };
