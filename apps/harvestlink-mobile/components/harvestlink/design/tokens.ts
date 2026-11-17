import type { TextStyle } from 'react-native'

/** Exact values transcribed from the five Superdesign drafts. */
export const FONT_BODY = 'Satoshi'
export const FONT_HEADING = 'Cabinet Grotesk'

export const C = {
  white: '#ffffff',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  farm900: '#143015',
  farm800: '#1e4620',
  farm700: '#2d5a27',
  farm600: '#3e7434',
  farm500: '#22c55e',
  farm400: '#4ade80',
  farm300: '#86efac',
  farm200: '#bbf7d0',
  farm100: '#dcfce7',
  farm50: '#f0fdf4',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue500: '#3b82f6',
  blue700: '#1d4ed8',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#ef4444',
  red600: '#dc2626',
  green500: '#22c55e',
  black40: 'rgba(0,0,0,0.4)',
  white10: 'rgba(255,255,255,0.1)',
  white20: 'rgba(255,255,255,0.2)',
  white80: 'rgba(255,255,255,0.8)',
} as const

export const R = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  pill: 999,
} as const

export const shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  action: {
    shadowColor: C.farm800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  avatar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
} as const

/** Satoshi is the draft body font. */
export function body(style: TextStyle = {}): TextStyle {
  return { fontFamily: FONT_BODY, ...style }
}

/** Cabinet Grotesk is used by headings and `.font-heading`. */
export function heading(style: TextStyle = {}): TextStyle {
  return { fontFamily: FONT_HEADING, ...style }
}

export const DESIGN_PROFILE_IMAGE =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop'

export const DESIGN_PRODUCE_IMAGE =
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=200&auto=format&fit=crop'

export const DESIGN_BUYER_IMAGE =
  'https://images.unsplash.com/photo-1531123897727-8f129e1bfa82?q=80&w=150&auto=format&fit=crop'
