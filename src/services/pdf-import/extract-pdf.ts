import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextContent } from 'pdfjs-dist/types/src/display/api';

import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import type { ImportPayload, OutlineEntry } from '@/services/tauri-bridge/types';

GlobalWorkerOptions.workerSrc = workerUrl;

type OutlineNode = {
  title: string;
  dest: string | unknown[] | null;
  items: OutlineNode[];
};

type ExtractProgress = {
  page: number;
  total: number;
};

const COVER_WIDTH = 420;

/**
 * Joins pdf.js text items into plain text, keeping line breaks.
 */
const textOf = (content: TextContent): string =>
  content.items
    .map(item => {
      if (!('str' in item)) {
        return '';
      }
      return item.str + (item.hasEOL ? '\n' : ' ');
    })
    .join('');

/**
 * Resolves an outline destination to a 1-based page number.
 */
const resolvePage = async (doc: PDFDocumentProxy, dest: OutlineNode['dest']): Promise<number | null> => {
  try {
    const explicit = typeof dest === 'string' ? await doc.getDestination(dest) : dest;
    if (!Array.isArray(explicit) || explicit.length === 0) {
      return null;
    }
    const ref = explicit[0];
    if (typeof ref === 'number') {
      return ref + 1;
    }
    if (ref && typeof ref === 'object' && 'num' in ref && 'gen' in ref) {
      return (await doc.getPageIndex(ref as { num: number; gen: number })) + 1;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Reads the table of contents. Uses the top level, or the second level when
 * the top level is too coarse (e.g. a book split into two "Parts").
 */
const readOutline = async (doc: PDFDocumentProxy): Promise<OutlineEntry[]> => {
  const top = ((await doc.getOutline()) ?? []) as OutlineNode[];
  const nodes = top.length >= 3 ? top : top.flatMap(node => (node.items.length > 0 ? node.items : [node]));
  const entries = await Promise.all(
    nodes.map(async node => ({ title: node.title.trim(), page: await resolvePage(doc, node.dest) })),
  );
  return entries.filter((entry): entry is OutlineEntry => entry.page !== null && entry.title.length > 0);
};

/**
 * Renders the first page to a small base64 JPEG used as the book cover.
 */
const renderCover = async (doc: PDFDocumentProxy): Promise<string | null> => {
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: COVER_WIDTH / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? null;
  } catch {
    return null;
  }
};

const metadataString = (info: unknown, key: string): string | null => {
  if (info && typeof info === 'object' && key in info) {
    const value = (info as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

/**
 * Extracts everything Alexandria needs from a PDF: per-page text, outline,
 * metadata and a cover image. Runs locally with pdf.js, no AI involved.
 */
const extractPdf = async (url: string, onProgress: (progress: ExtractProgress) => void): Promise<ImportPayload> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not read the PDF (${response.status})`);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  const task = getDocument({ data });
  const doc = await task.promise;

  try {
    const total = doc.numPages;
    const pages: string[] = [];
    for (let number = 1; number <= total; number += 1) {
      const page = await doc.getPage(number);
      pages.push(textOf(await page.getTextContent()));
      page.cleanup();
      onProgress({ page: number, total });
    }
    const metadata = await doc.getMetadata().catch(() => null);
    return {
      title: metadataString(metadata?.info, 'Title'),
      author: metadataString(metadata?.info, 'Author'),
      pages,
      outline: await readOutline(doc).catch(() => []),
      coverJpeg: await renderCover(doc),
    };
  } finally {
    await task.destroy();
  }
};

export type { ExtractProgress };
export { extractPdf };
