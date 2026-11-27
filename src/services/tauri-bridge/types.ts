type BookStatus = 'importing' | 'queued' | 'processing' | 'paused' | 'failed' | 'ready';
type SectionStatus = 'pending' | 'processing' | 'done' | 'failed';
type QuestionKind = 'multiple_choice' | 'true_false' | 'short_answer';
type DocumentKind = 'notes' | 'key-data';
type ThemePreference = 'system' | 'light' | 'dark';
type AttemptStatus = 'in_progress' | 'review' | 'graded';

type ClaudeStatus = {
  installed: boolean;
  path: string | null;
  version: string | null;
  loggedIn: boolean;
  email: string | null;
  authMethod: string | null;
  subscription: string | null;
  error: string | null;
};

type Settings = {
  theme: ThemePreference;
  model: string;
  concurrency: number;
  questionsPerSection: number;
  bookQuestions: number;
  claudePath: string;
  sidebarHidden: boolean;
  palette: string;
  font: string;
  maxCostUsd: number;
};

type AppInfo = {
  version: string;
  dataDir: string;
  databasePath: string;
  sourceDir: string;
  canUpdate: boolean;
};

type SearchHit = {
  bookId: string;
  bookTitle: string;
  kind: DocumentKind;
  file: string;
  title: string;
  snippet: string;
  score: number;
};

type UsageSnapshot = {
  fiveHour: number;
  fiveHourResetsAt: number;
  sevenDay: number | null;
  sevenDayResetsAt: number | null;
  updatedAt: string;
};

type MaintenanceAction = 'update' | 'reset' | 'uninstall';

type MaintenanceProgress = {
  action: MaintenanceAction | null;
  lines: string[];
  running: boolean;
  readyToInstall: boolean;
  failed: boolean;
};

type Book = {
  id: string;
  title: string;
  author: string | null;
  dirName: string;
  dir: string;
  pdfPath: string;
  coverPath: string | null;
  fileName: string;
  pageCount: number;
  status: BookStatus;
  stage: 'sections' | 'book' | 'done' | null;
  error: string | null;
  summary: string | null;
  costUsd: number;
  createdAt: string;
  updatedAt: string;
  sectionsTotal: number;
  sectionsDone: number;
  questionCount: number;
};

type Section = {
  id: number;
  idx: number;
  title: string;
  placeholder: boolean;
  startPage: number;
  endPage: number;
  wordCount: number;
  mode: 'text' | 'vision';
  status: SectionStatus;
  error: string | null;
  summary: string | null;
  fileStem: string | null;
  questionCount: number;
};

type BookDetail = {
  book: Book;
  sections: Section[];
  costCapUsd: number;
};

type DocumentInfo = {
  file: string;
  title: string;
  group: 'Book' | 'Sections';
};

type OutlineEntry = {
  title: string;
  page: number;
};

type ImportPayload = {
  title: string | null;
  author: string | null;
  pages: string[];
  outline: OutlineEntry[];
  coverJpeg: string | null;
};

type StartTestOptions = {
  sectionIds: number[];
  includeBook: boolean;
  count: number;
  kinds: QuestionKind[];
};

type AttemptItem = {
  questionId: number;
  position: number;
  kind: QuestionKind;
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  options: string[];
  sectionTitle: string | null;
  response: string | null;
  score: number | null;
  answer: string | null;
  explanation: string | null;
};

type AttemptDetail = {
  id: string;
  bookId: string;
  bookTitle: string;
  status: AttemptStatus;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  questionCount: number;
  items: AttemptItem[];
};

type AttemptSummary = {
  id: string;
  status: AttemptStatus;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  questionCount: number;
};

type SectionMastery = {
  sectionId: number | null;
  title: string;
  questionCount: number;
  answered: number;
  mastery: number | null;
};

type QuizStats = {
  total: number;
  byKind: Partial<Record<QuestionKind, number>>;
  attempts: number;
  bestScore: number | null;
  averageScore: number | null;
  lastScore: number | null;
  sections: SectionMastery[];
};

type ResponseInput = {
  questionId: number;
  response: string | null;
};

export type {
  AppInfo,
  AttemptDetail,
  AttemptItem,
  AttemptStatus,
  AttemptSummary,
  Book,
  BookDetail,
  BookStatus,
  ClaudeStatus,
  DocumentInfo,
  DocumentKind,
  ImportPayload,
  MaintenanceAction,
  MaintenanceProgress,
  OutlineEntry,
  QuestionKind,
  QuizStats,
  ResponseInput,
  SearchHit,
  Section,
  SectionMastery,
  SectionStatus,
  Settings,
  StartTestOptions,
  ThemePreference,
  UsageSnapshot,
};
