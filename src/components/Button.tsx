import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
  block?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', block, icon, className, children, type = 'button', ...rest }: Props) {
  const cls = ['btn', `btn--${variant}`, block && 'btn--block', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ className, children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={['icon-btn', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
