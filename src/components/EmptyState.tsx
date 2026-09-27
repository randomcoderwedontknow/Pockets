import type { ReactNode } from 'react';
import { PocketIllustration } from './PocketIllustration';
import './EmptyState.css';

export type EmptyVariant = 'pockets' | 'pocket' | 'search' | 'pinned' | 'favourites' | 'default';

interface Props {
  title: string;
  body?: string;
  action?: ReactNode;
  secondary?: ReactNode;
  variant?: EmptyVariant;
  hero?: boolean;
}

export function EmptyState({ title, body, action, secondary, variant = 'default', hero }: Props) {
  const showIllustration = variant === 'pockets' || variant === 'pocket' || variant === 'default';
  return (
    <div className={['empty', hero && 'empty--hero'].filter(Boolean).join(' ')}>
      {showIllustration && <PocketIllustration size={hero ? 88 : 72} />}
      <h3>{title}</h3>
      {body && <p className="empty-body">{body}</p>}
      {action && <div className="empty-action">{action}</div>}
      {secondary && <div className="empty-secondary">{secondary}</div>}
    </div>
  );
}
