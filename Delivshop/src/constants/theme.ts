/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const DelivColors = {
  deepEmerald: '#064E3B',
  emeraldGreen: '#047857',
  lightEmerald: '#D1FAE5',
  ivory: '#FFFBEB',
  white: '#FFFFFF',
  warmNeutral: '#D6D3C8',
  backgroundNeutral: '#F8F8F2',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#1F2937',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#DBEAFE',
  success: '#10B981',
  successBg: '#D1FAE5',
} as const;

export const Colors = {
  light: {
    text: DelivColors.textPrimary,
    background: DelivColors.white,
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: DelivColors.textSecondary,
    tint: DelivColors.emeraldGreen,
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    tint: DelivColors.lightEmerald,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
