// =============================================================================
// Design System / Theme
// =============================================================================
// Centralized design tokens for the patient-facing ECG monitoring app.
// Follows medical UI best practices:
//   - High contrast for readability
//   - Large touch targets (minimum 44pt per Apple HIG)
//   - Clear color semantics for risk/status indicators
//   - Accessible color combinations (WCAG AA minimum)
// =============================================================================

export const colors = {
  // Brand
  primary: '#2563EB',       // Blue-600: Trust, medical
  primaryLight: '#3B82F6',  // Blue-500
  primaryDark: '#1D4ED8',   // Blue-700

  // Semantic - maps to EventSeverity / PatientStatus.riskLevel
  success: '#16A34A',       // Green-600: Normal, healthy
  warning: '#D97706',       // Amber-600: Attention needed
  danger: '#DC2626',        // Red-600: Urgent/critical
  info: '#0891B2',          // Cyan-600: Informational

  // Backgrounds
  background: '#F8FAFC',    // Slate-50: Main app background
  surface: '#FFFFFF',       // White: Card surfaces
  surfaceElevated: '#F1F5F9', // Slate-100: Elevated elements

  // Text
  textPrimary: '#0F172A',   // Slate-900: Primary text
  textSecondary: '#64748B', // Slate-500: Secondary text
  textTertiary: '#94A3B8',  // Slate-400: Placeholder, disabled
  textOnPrimary: '#FFFFFF', // White text on primary color
  textOnDanger: '#FFFFFF',

  // Borders
  border: '#E2E8F0',        // Slate-200
  borderLight: '#F1F5F9',   // Slate-100

  // ECG-specific
  ecgTrace: '#16A34A',      // Green: Normal ECG trace
  ecgTraceAlert: '#DC2626', // Red: ECG trace during anomaly
  ecgGrid: '#E2E8F0',       // Light grid lines
  ecgGridMajor: '#CBD5E1',  // Major grid lines
  ecgBackground: '#FAFBFC', // ECG canvas background

  // Device status
  deviceConnected: '#16A34A',
  deviceDisconnected: '#94A3B8',
  deviceSearching: '#D97706',
  deviceError: '#DC2626',

  // Battery
  batteryGood: '#16A34A',   // >50%
  batteryMedium: '#D97706', // 20-50%
  batteryLow: '#DC2626',    // <20%
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  hero: 42,  // Large BPM display — clinical, not oversized
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/**
 * Minimum touch target size per Apple HIG and WCAG guidelines.
 * All interactive elements must be at least this size.
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Maps risk levels to display colors.
 */
export const riskLevelColors: Record<string, string> = {
  normal: colors.success,
  attention: colors.warning,
  elevated: colors.danger,
  critical: colors.danger,
};

/**
 * Maps event severity to display colors.
 */
export const severityColors: Record<string, string> = {
  info: colors.info,
  warning: colors.warning,
  urgent: colors.danger,
  critical: colors.danger,
};

/**
 * Shadow styles for card elevation.
 * React Native doesn't support CSS box-shadow; using platform-specific props.
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
