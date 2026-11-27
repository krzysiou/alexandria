import { convertFileSrc } from '@tauri-apps/api/core';

import type { CoverSize } from '@/components/ui-kit/BookCover.styles';
import type { Book } from '@/services/tauri-bridge/types';

import { Cover, Placeholder } from '@/components/ui-kit/BookCover.styles';

/**
 * Book cover image (first PDF page), or a typographic placeholder.
 */
const BookCover = ({ book, size = 'md' }: { book: Pick<Book, 'title' | 'coverPath'>; size?: CoverSize }) => (
  <Cover $size={size}>
    {book.coverPath ? (
      <img src={convertFileSrc(book.coverPath)} alt="" draggable={false} />
    ) : (
      <Placeholder $size={size}>
        <span>{book.title}</span>
      </Placeholder>
    )}
  </Cover>
);

export { BookCover };
