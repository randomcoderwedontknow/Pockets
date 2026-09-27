import type { CSSProperties } from 'react';
import {
  Book,
  Briefcase,
  Camera,
  Car,
  Cpu,
  FileText,
  Folder,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Key,
  Link2,
  Monitor,
  Music,
  Plane,
  Shield,
  ShoppingBag,
  Smartphone,
  Star,
  Ticket,
  User,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ItemType } from '@/domain/types';
import { pocketColorVar } from '@/domain/pocketMeta';
import type { PocketColor } from '@/domain/types';

export const ICONS: Record<string, LucideIcon> = {
  user: User,
  star: Star,
  cpu: Cpu,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  link: Link2,
  ticket: Ticket,
  briefcase: Briefcase,
  home: Home,
  heart: Heart,
  car: Car,
  plane: Plane,
  wallet: Wallet,
  'shopping-bag': ShoppingBag,
  camera: Camera,
  music: Music,
  book: Book,
  wrench: Wrench,
  shield: Shield,
  folder: Folder,
  key: Key,
  smartphone: Smartphone,
  globe: Globe,
  gift: Gift,
  monitor: Monitor,
  'file-text': FileText,
};

export function PocketGlyph({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Folder;
  return <Icon size={size} strokeWidth={1.9} />;
}

export function PocketBadge({
  icon,
  color,
  size = 44,
  soft = false,
}: {
  icon: string;
  color: PocketColor;
  size?: number;
  soft?: boolean;
}) {
  return (
    <span
      className={`icon-badge${soft ? ' icon-badge--soft' : ''}${size < 40 ? ' icon-badge--sm' : ''}`}
      style={{ '--badge-color': pocketColorVar(color), width: size, height: size } as CSSProperties}
    >
      <PocketGlyph name={icon} size={size < 40 ? 16 : 20} />
    </span>
  );
}

export const ITEM_TYPE_ICONS: Record<ItemType, LucideIcon> = {
  important: Star,
  secure: Shield,
  code: Ticket,
  link: Link2,
  note: FileText,
  device: Monitor,
};
