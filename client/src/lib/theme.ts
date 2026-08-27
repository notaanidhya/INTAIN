import { useState, useEffect } from 'react';

/**
 * Design System Tokens & Chart Palettes
 * Intain Institutional Console
 */

export interface ThemeTokens {
  bgBase: string;
  bgSurface: string;
  bgSurfaceAlt: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  brand: string;
  brandSubtleBg: string;
  success: string;
  warning: string;
  critical: string;
  info: string;
}

export const DARK_TOKENS: ThemeTokens = {
  bgBase: '#0B0E14',
  bgSurface: '#12151C',
  bgSurfaceAlt: '#171B24',
  border: '#232838',
  borderStrong: '#2E3448',
  textPrimary: '#E9EBF1',
  textSecondary: '#9298AA',
  textMuted: '#6B7182',
  brand: '#6366F1',
  brandSubtleBg: '#1B1D3A',
  success: '#34D399',
  warning: '#F5B942',
  critical: '#F0596B',
  info: '#7C9CF5',
};

export const LIGHT_TOKENS: ThemeTokens = {
  bgBase: '#F4F5F9',
  bgSurface: '#FFFFFF',
  bgSurfaceAlt: '#EEF0F5',
  border: '#E1E4EC',
  borderStrong: '#CBD0DC',
  textPrimary: '#171A24',
  textSecondary: '#565D71',
  textMuted: '#828896',
  brand: '#4F46E5',
  brandSubtleBg: '#EEEEFC',
  success: '#0F9D66',
  warning: '#B4740E',
  critical: '#D8394D',
  info: '#4C63C7',
};

/**
 * 4-Color Categorical Palette for Non-Severity Data
 * (e.g. Geographic State Exposure, Servicer Distributions)
 * Deliberately non-alarming to prevent false severity impressions.
 */
export const CATEGORICAL_PALETTE = [
  '#6366F1', // 1. Brand Indigo
  '#22C3A6', // 2. Balanced Teal
  '#F2A93B', // 3. Amber (Neutral)
  '#8A8FA3', // 4. Slate Gray (Other / Unclassified)
];

/**
 * Returns current active theme tokens based on DOM state or preference
 */
export function getActiveTokens(isDark?: boolean): ThemeTokens {
  if (isDark !== undefined) {
    return isDark ? DARK_TOKENS : LIGHT_TOKENS;
  }
  if (typeof document !== 'undefined') {
    const isDocDark = document.documentElement.classList.contains('dark') || 
                      document.documentElement.getAttribute('data-theme') === 'dark';
    return isDocDark ? DARK_TOKENS : LIGHT_TOKENS;
  }
  return DARK_TOKENS;
}

/**
 * Recharts Tooltip Styling Helper
 */
export function getChartTooltipStyle(isDark: boolean = true) {
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  return {
    backgroundColor: isDark ? 'rgba(18, 21, 28, 0.96)' : 'rgba(255, 255, 255, 0.98)',
    borderColor: tokens.borderStrong,
    borderWidth: '1px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: tokens.textPrimary,
    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
    padding: '6px 10px',
  };
}

/**
 * Reactive React Hook for Theme Tokens & SVG Charts
 */
export function useThemeTokens() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return true;
  });

  const [tokens, setTokens] = useState<ThemeTokens>(() => getActiveTokens(isDark));

  useEffect(() => {
    const update = () => {
      const dark = document.documentElement.classList.contains('dark') || 
                   document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDark(dark);
      setTokens(getActiveTokens(dark));
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    return () => observer.disconnect();
  }, []);

  return {
    tokens,
    isDark,
    tooltipStyle: getChartTooltipStyle(isDark),
    categoricalPalette: CATEGORICAL_PALETTE
  };
}
