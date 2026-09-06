/**
 * Minimal shared tokens for the native shell. Pixel parity with the web client is not a
 * goal (decision #2); this only keeps the first screens visually coherent.
 */
export const theme = {
  colors: {
    background: '#0F1115',
    surface: '#171A21',
    border: '#272B35',
    text: '#F5F6F8',
    textMuted: '#A2A9B8',
    accent: '#6C8CFF',
    danger: '#FF6B6B',
    onAccent: '#0F1115',
  },
  spacing: (step: number) => step * 8,
  radius: 12,
} as const;
