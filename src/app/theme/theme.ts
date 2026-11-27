import { keyframes } from 'styled-components';

const color = {
  bg: 'var(--bg)',
  bgSidebar: 'var(--bg-sidebar)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  surfaceHover: 'var(--surface-hover)',
  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',
  text: 'var(--text)',
  textMuted: 'var(--text-muted)',
  textFaint: 'var(--text-faint)',
  accent: 'var(--accent)',
  accentHover: 'var(--accent-hover)',
  accentSoft: 'var(--accent-soft)',
  accentText: 'var(--accent-text)',
  onAccent: 'var(--on-accent)',
  gold: 'var(--gold)',
  goldSoft: 'var(--gold-soft)',
  success: 'var(--success)',
  successSoft: 'var(--success-soft)',
  danger: 'var(--danger)',
  dangerSoft: 'var(--danger-soft)',
  overlay: 'var(--overlay)',
};

const shadow = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
};

const radius = {
  sm: '8px',
  md: '12px',
  lg: '18px',
};

const font = {
  sans: 'var(--font-sans)',
  serif: 'var(--font-serif)',
  mono: 'var(--font-mono)',
};

const ease = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

const sidebarWidth = '264px';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const rise = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
`;

type Tone = 'default' | 'muted' | 'faint' | 'accent' | 'success' | 'gold' | 'danger';

const toneColor: Record<Tone, string> = {
  default: color.text,
  muted: color.textMuted,
  faint: color.textFaint,
  accent: color.accentText,
  success: color.success,
  gold: color.gold,
  danger: color.danger,
};

export type { Tone };
export { color, ease, font, radius, rise, shadow, sidebarWidth, spin, toneColor };
