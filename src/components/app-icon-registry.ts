// Centralized registry of app icons (as inline SVG markup) and brand colors.
// Used by TagInput (raw HTML in contentEditable) and drag-preview builders.

/** Lucide-compatible SVG inner paths keyed by appId */
const SVG_PATHS: Record<string, string> = {
  // Communication
  gmail:    '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  slack:    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  telegram: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  twilio:   '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',

  // Productivity
  gcal:     '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  notion:   '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  gsheets:  '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
  asana:    '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73Z"/>',

  // Storage
  gdrive:   '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  dropbox:  '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',

  // E-commerce / Payment
  shopify:  '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  stripe:   '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',

  // CRM
  hubspot:  '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',

  // Developer
  github:   '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',

  // Media
  zoom:     '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  spotify:  '<circle cx="12" cy="12" r="10"/><path d="M8 14.5c2-1 4.5-1 7 0"/><path d="M6.5 11.5c3-1.5 7-1.5 11 0"/><path d="M5 8.5c4-2 9.5-2 14 0"/>',
  unsplash: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  airtable: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',

  // Trigger / Utility
  trigger:  '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  webhook:  '<path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8H12"/>',
};

/** Tailwind bg-class → hex colour */
const TW_COLOR_HEX: Record<string, string> = {
  'bg-gray-500':  '#6b7280',
  'bg-gray-800':  '#1f2937',
  'bg-gray-900':  '#111827',
  'bg-red-500':   '#ef4444',
  'bg-red-600':   '#dc2626',
  'bg-blue-500':  '#3b82f6',
  'bg-blue-600':  '#2563eb',
  'bg-green-500': '#22c55e',
  'bg-green-600': '#16a34a',
  'bg-yellow-500':'#eab308',
  'bg-purple-500':'#a855f7',
  'bg-pink-500':  '#ec4899',
  'bg-indigo-500':'#6366f1',
  'bg-orange-500':'#f97316',
  'bg-sky-500':   '#0ea5e9',
  'bg-gray-700':  '#374151',
  'bg-[hsl(257,74%,57%)]': '#7c3aed',
};

/** Canonical brand colour per app (hex) */
const APP_COLORS: Record<string, string> = {
  gmail:    '#ef4444',
  slack:    '#a855f7',
  gcal:     '#3b82f6',
  notion:   '#1f2937',
  airtable: '#eab308',
  dropbox:  '#2563eb',
  shopify:  '#16a34a',
  stripe:   '#7c3aed',
  hubspot:  '#f97316',
  gdrive:   '#22c55e',
  github:   '#111827',
  asana:    '#ec4899',
  telegram: '#0ea5e9',
  twilio:   '#dc2626',
  zoom:     '#3b82f6',
  spotify:  '#22c55e',
  gsheets:  '#16a34a',
  unsplash: '#374151',
  trigger:  '#6b7280',
  webhook:  '#6b7280',
};

// ────────────────────────────────────────────
// Public helpers
// ────────────────────────────────────────────

/**
 * Returns an inline `<svg>` HTML string for the given appId.
 * Designed for use in contentEditable / raw DOM contexts.
 * @param size pixel width & height (default 10)
 */
export function getAppIconSvg(appId: string, size = 10): string {
  const paths = SVG_PATHS[appId];
  if (!paths) {
    // Fallback: generic gear/cog
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/**
 * Returns a hex colour string for a Tailwind bg class (e.g. "bg-red-500" → "#ef4444").
 * Falls back to neutral gray.
 */
export function twColorToHex(twClass: string): string {
  return TW_COLOR_HEX[twClass] || '#6b7280';
}

/**
 * Returns the canonical brand hex colour for the given appId.
 */
export function getAppColorHex(appId: string): string {
  return APP_COLORS[appId] || '#6b7280';
}
