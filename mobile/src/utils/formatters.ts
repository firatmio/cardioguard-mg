// =============================================================================
// Utility: Formatters
// =============================================================================
// Pure functions for formatting display values throughout the app.
// All formatters are locale-aware where applicable.
// =============================================================================

/**
 * Format a BPM value for display.
 * Returns "--" for null/undefined values (e.g., when no data is available).
 */
export function formatBPM(bpm: number | null | undefined): string {
  if (bpm == null || isNaN(bpm)) return '--';
  return Math.round(bpm).toString();
}

/**
 * Format a duration in seconds to a human-readable string.
 * Examples: "2h 15m", "45m", "30s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 && minutes < 5 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  return `${secs}s`;
}

/**
 * Format a timestamp to a relative time string.
 * Examples: "Just now", "5 min ago", "2 hours ago", "Yesterday"
 */
export function formatRelativeTime(timestamp: string | number): string {
  const now = Date.now();
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diffMs = now - time;

  if (diffMs < 0) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  return new Date(time).toLocaleDateString();
}

/**
 * Format a timestamp to time string (HH:MM).
 */
export function formatTime(timestamp: string | number): string {
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format a timestamp to date string.
 */
export function formatDate(timestamp: string | number): string {
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a signal quality value (0-1) to display text.
 */
export function formatSignalQuality(quality: number): {
  label: string;
  color: string;
} {
  if (quality >= 0.8) return { label: 'Excellent', color: '#16A34A' };
  if (quality >= 0.6) return { label: 'Good', color: '#16A34A' };
  if (quality >= 0.4) return { label: 'Fair', color: '#D97706' };
  if (quality >= 0.2) return { label: 'Poor', color: '#DC2626' };
  return { label: 'No Signal', color: '#94A3B8' };
}

/**
 * Format battery level to display text with color.
 */
export function formatBatteryLevel(level: number | null): {
  label: string;
  color: string;
} {
  if (level == null) return { label: '--', color: '#94A3B8' };
  if (level > 50) return { label: `${level}%`, color: '#16A34A' };
  if (level > 20) return { label: `${level}%`, color: '#D97706' };
  return { label: `${level}%`, color: '#DC2626' };
}

/**
 * Format a file size in bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
