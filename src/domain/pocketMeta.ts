import type { PocketColor } from './types';

export const POCKET_COLORS: { key: PocketColor; label: string; cssVar: string }[] = [
  { key: 'lavender', label: 'Lavender', cssVar: '--pocket-lavender' },
  { key: 'green', label: 'Green', cssVar: '--pocket-green' },
  { key: 'blue', label: 'Blue', cssVar: '--pocket-blue' },
  { key: 'purple', label: 'Purple', cssVar: '--pocket-purple' },
  { key: 'orange', label: 'Orange', cssVar: '--pocket-orange' },
  { key: 'red', label: 'Red', cssVar: '--pocket-red' },
  { key: 'teal', label: 'Teal', cssVar: '--pocket-teal' },
  { key: 'pink', label: 'Pink', cssVar: '--pocket-pink' },
  { key: 'slate', label: 'Slate', cssVar: '--pocket-slate' },
  { key: 'amber', label: 'Amber', cssVar: '--pocket-amber' },
  { key: 'cyan', label: 'Cyan', cssVar: '--pocket-cyan' },
  { key: 'indigo', label: 'Indigo', cssVar: '--pocket-indigo' },
  { key: 'rose', label: 'Rose', cssVar: '--pocket-rose' },
  { key: 'lime', label: 'Lime', cssVar: '--pocket-lime' },
];

export function pocketColorVar(color: PocketColor): string {
  return `var(${POCKET_COLORS.find((c) => c.key === color)?.cssVar ?? '--pocket-lavender'})`;
}

/** Icon keys available for pockets. Resolved to Lucide components in the UI. */
export const POCKET_ICONS: string[] = [
  'user',
  'star',
  'cpu',
  'gamepad-2',
  'graduation-cap',
  'link',
  'ticket',
  'briefcase',
  'home',
  'heart',
  'car',
  'plane',
  'wallet',
  'shopping-bag',
  'camera',
  'music',
  'book',
  'wrench',
  'shield',
  'folder',
  'key',
  'smartphone',
  'globe',
  'gift',
  'credit-card',
  'file-text',
  'map-pin',
  'pill',
  'building',
  'users',
  'tag',
  'lock',
  'cloud',
  'stethoscope',
];
