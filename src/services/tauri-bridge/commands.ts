import { invoke } from '@tauri-apps/api/core';

import type {
  AppInfo,
  AttemptDetail,
  AttemptSummary,
  Book,
  BookDetail,
  ClaudeStatus,
  DocumentInfo,
  DocumentKind,
  ImportPayload,
  MaintenanceAction,
  MaintenanceProgress,
  QuizStats,
  ResponseInput,
  SearchHit,
  Settings,
  StartTestOptions,
  UsageSnapshot,
} from '@/services/tauri-bridge/types';

/**
 * Typed wrappers around the Rust commands in `src-tauri/src/commands.rs`.
 */
const api = {
  claudeStatus: () => invoke<ClaudeStatus>('claude_status'),
  claudeLogin: () => invoke<void>('claude_login'),
  claudeInstall: () => invoke<void>('claude_install'),
  claudeUsage: () => invoke<UsageSnapshot | null>('claude_usage'),

  appInfo: () => invoke<AppInfo>('app_info'),
  getSettings: () => invoke<Settings>('get_settings'),
  saveSettings: (settings: Settings) => invoke<Settings>('save_settings', { settings }),

  listBooks: () => invoke<Book[]>('list_books'),
  getBook: (id: string) => invoke<BookDetail>('get_book', { id }),
  importBookStart: (path: string) => invoke<Book>('import_book_start', { path }),
  importBookFinish: (id: string, payload: ImportPayload) => invoke<Book>('import_book_finish', { id, payload }),
  pauseBook: (id: string) => invoke<void>('pause_book', { id }),
  resumeBook: (id: string) => invoke<void>('resume_book', { id }),
  deleteBook: (id: string) => invoke<void>('delete_book', { id }),
  listDocuments: (id: string, kind: DocumentKind) => invoke<DocumentInfo[]>('list_documents', { id, kind }),
  readDocument: (id: string, kind: DocumentKind, file: string) => invoke<string>('read_document', { id, kind, file }),
  runMaintenance: (action: MaintenanceAction) => invoke<void>('run_maintenance', { action }),
  maintenanceProgress: () => invoke<MaintenanceProgress>('maintenance_progress'),
  searchLibrary: (query: string) => invoke<SearchHit[]>('search_library', { query }),
  saveBookPdf: (id: string, destination: string) => invoke<string>('save_book_pdf', { id, destination }),
  revealInFinder: (id?: string) => invoke<void>('reveal_in_finder', { id: id ?? null }),
  openExternal: (url: string) => invoke<void>('open_external', { url }),

  quizStats: (bookId: string) => invoke<QuizStats>('quiz_stats', { bookId }),
  startTest: (bookId: string, options: StartTestOptions) => invoke<string>('start_test', { bookId, options }),
  getTest: (id: string) => invoke<AttemptDetail>('get_test', { id }),
  listTests: (bookId: string) => invoke<AttemptSummary[]>('list_tests', { bookId }),
  saveAnswer: (id: string, questionId: number, response: string | null) =>
    invoke<void>('save_answer', { id, questionId, response }),
  submitTest: (id: string, responses: ResponseInput[]) => invoke<AttemptDetail>('submit_test', { id, responses }),
  selfGrade: (id: string, questionId: number, score: number) =>
    invoke<AttemptDetail>('self_grade', { id, questionId, score }),
  deleteTest: (id: string) => invoke<void>('delete_test', { id }),
};

/**
 * Turns anything thrown by `invoke` into a readable message.
 */
const errorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong';
};

export { api, errorMessage };
