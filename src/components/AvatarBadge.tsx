import type { CSSProperties } from 'react';

const PRESET_HUES: Record<string, number> = {
  'lavender-1': 262,
  'lavender-2': 278,
  'lavender-3': 248,
  'lavender-4': 290,
  'lavender-5': 255,
  'lavender-6': 300,
  'lavender-7': 270,
  'lavender-8': 285,
};

interface Props {
  preset: string;
  name?: string;
  size?: number;
}

export function AvatarBadge({ preset, name, size = 48 }: Props) {
  const hue = PRESET_HUES[preset] ?? 262;
  const initial = (name?.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className="avatar-badge"
      aria-hidden={!name}
      style={
        {
          '--avatar-size': `${size}px`,
          '--avatar-hue': hue,
        } as CSSProperties
      }
    >
      {initial}
    </span>
  );
}
