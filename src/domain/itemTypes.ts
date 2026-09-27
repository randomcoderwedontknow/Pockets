import type { FieldDraft, ItemType } from './types';

export interface ItemTypeMeta {
  type: ItemType;
  label: string;
  description: string;
  /** Lucide icon key (resolved in the UI layer). */
  icon: string;
  /** Whether new items of this type start with "protect this item" enabled. */
  defaultProtected: boolean;
  /** Starting fields presented when creating an item of this type. */
  template: () => FieldDraft[];
}

const f = (name: string, kind: FieldDraft['kind'] = 'text', prot = false): FieldDraft => ({
  name,
  kind,
  protected: prot,
  value: '',
});

export const ITEM_TYPES: ItemTypeMeta[] = [
  {
    type: 'important',
    label: 'Important information',
    description: 'Reference numbers, IDs and records',
    icon: 'star',
    defaultProtected: false,
    template: () => [f('Reference'), f('Notes', 'multiline')],
  },
  {
    type: 'secure',
    label: 'Secure information',
    description: 'Protected behind authentication',
    icon: 'shield',
    defaultProtected: true,
    template: () => [f('Value', 'text', true), f('Notes', 'multiline', true)],
  },
  {
    type: 'code',
    label: 'Code',
    description: 'Vouchers, game codes, references',
    icon: 'ticket',
    defaultProtected: false,
    template: () => [f('Code', 'code'), f('Expires')],
  },
  {
    type: 'link',
    label: 'Link',
    description: 'A website or resource to open later',
    icon: 'link',
    defaultProtected: false,
    template: () => [f('URL', 'url')],
  },
  {
    type: 'note',
    label: 'Note',
    description: 'A short structured note',
    icon: 'file-text',
    defaultProtected: false,
    template: () => [f('Note', 'multiline')],
  },
  {
    type: 'device',
    label: 'Device / Item',
    description: 'Specs and details of a physical thing',
    icon: 'monitor',
    defaultProtected: false,
    template: () => [f('Model'), f('Serial number'), f('Notes', 'multiline')],
  },
];

export const DEVICE_PRESETS: Record<string, string[]> = {
  PC: ['CPU', 'GPU', 'RAM', 'Storage', 'OS', 'Notes'],
  Phone: ['Model', 'IMEI', 'Storage', 'OS', 'Notes'],
  Laptop: ['Model', 'CPU', 'RAM', 'Storage', 'OS', 'Serial number'],
};

export function itemTypeMeta(type: ItemType): ItemTypeMeta {
  return ITEM_TYPES.find((t) => t.type === type) ?? ITEM_TYPES[0];
}
