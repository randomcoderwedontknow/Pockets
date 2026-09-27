import { Logo } from './Logo';

interface Props {
  size?: number;
}

/** Decorative pocket mark for empty states — not user data. */
export function PocketIllustration({ size = 72 }: Props) {
  return (
    <div className="pocket-illustration" aria-hidden="true">
      <Logo size={size} />
    </div>
  );
}
