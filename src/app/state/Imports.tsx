import type { ReactNode } from 'react';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

import { useNavigation } from '@/app/state/Navigation';
import { extractPdf } from '@/services/pdf-import/extract-pdf';
import { api, errorMessage } from '@/services/tauri-bridge/commands';

type ImportJob = {
  id: string;
  name: string;
  stage: 'copying' | 'reading' | 'saving' | 'failed';
  page: number;
  total: number;
  error: string | null;
};

type ImportsValue = {
  jobs: ImportJob[];
  importFiles: (paths: string[]) => void;
  dismiss: (id: string) => void;
};

const ImportsContext = createContext<ImportsValue | null>(null);

const fileName = (path: string): string => path.split('/').pop() ?? path;

/**
 * Tracks PDF imports. An import copies the file into the library (Rust),
 * extracts its text with pdf.js (here, locally) and hands the text to the
 * backend, which then starts the one-time parsing with Claude.
 */
const ImportsProvider = ({ children }: { children: ReactNode }) => {
  const { navigate } = useNavigation();
  const [jobs, setJobs] = useState<ImportJob[]>([]);

  const update = useCallback((id: string, patch: Partial<ImportJob>) => {
    setJobs(current => current.map(job => (job.id === id ? { ...job, ...patch } : job)));
  }, []);

  const runImport = useCallback(
    async (path: string, openWhenDone: boolean) => {
      const id = `${path}:${Date.now()}`;
      setJobs(current => [...current, { id, name: fileName(path), stage: 'copying', page: 0, total: 0, error: null }]);
      let bookId: string | null = null;
      try {
        const book = await api.importBookStart(path);
        bookId = book.id;
        update(id, { stage: 'reading' });
        const payload = await extractPdf(convertFileSrc(book.pdfPath), progress =>
          update(id, { page: progress.page, total: progress.total }),
        );
        update(id, { stage: 'saving' });
        await api.importBookFinish(book.id, payload);
        setJobs(current => current.filter(job => job.id !== id));
        if (openWhenDone) {
          navigate({ name: 'book', bookId: book.id, tab: 'overview' });
        }
      } catch (caught) {
        if (bookId) {
          await api.deleteBook(bookId).catch(() => undefined);
        }
        update(id, { stage: 'failed', error: errorMessage(caught) });
      }
    },
    [navigate, update],
  );

  const importFiles = useCallback(
    (paths: string[]) => {
      const pdfs = paths.filter(path => path.toLowerCase().endsWith('.pdf'));
      for (const path of pdfs) {
        void runImport(path, pdfs.length === 1);
      }
    },
    [runImport],
  );

  const dismiss = useCallback((id: string) => {
    setJobs(current => current.filter(job => job.id !== id));
  }, []);

  const value = useMemo(() => ({ jobs, importFiles, dismiss }), [jobs, importFiles, dismiss]);
  return <ImportsContext.Provider value={value}>{children}</ImportsContext.Provider>;
};

/**
 * Running imports and `importFiles()`.
 */
const useImports = (): ImportsValue => {
  const value = useContext(ImportsContext);
  if (!value) {
    throw new Error('useImports must be used inside ImportsProvider');
  }
  return value;
};

export type { ImportJob };
export { ImportsProvider, useImports };
