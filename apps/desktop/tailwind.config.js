/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { primary: 'var(--bg-primary)', surface: 'var(--bg-surface)', elevated: 'var(--bg-elevated)' },
        border: { subtle: 'var(--border-subtle)' },
        buy: 'var(--accent-buy)',
        tp: 'var(--accent-tp)',
        sl: 'var(--accent-sl)',
        txt: { primary: 'var(--text-primary)', muted: 'var(--text-muted)' },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '8px', btn: '4px' },
    },
  },
  plugins: [],
}
