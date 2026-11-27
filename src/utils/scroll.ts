const MAIN_SCROLL_ID = 'main-scroll';

/**
 * Scrolls the main content area (not the sidebar) back to the top.
 */
const scrollMainToTop = (smooth = true): void => {
  document.getElementById(MAIN_SCROLL_ID)?.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
};

export { MAIN_SCROLL_ID, scrollMainToTop };
