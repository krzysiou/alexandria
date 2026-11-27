import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';

import type { ButtonSize, ButtonVariant } from '@/components/ui-kit/Button.styles';

import { Button, IconButton } from '@/components/ui-kit/Button.styles';

type Props = {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  icon?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  title?: string;
};

const DISARM_AFTER_MS = 4000;

/**
 * Button that asks for a second click before running a destructive action.
 * It disarms itself after a few seconds.
 */
const ConfirmButton = ({
  onConfirm,
  children,
  confirmLabel = 'Click again to confirm',
  icon = false,
  variant = 'danger',
  size,
  title,
}: Props) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) {
      return;
    }

    const timer = window.setTimeout(() => setArmed(false), DISARM_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const onClick = () => {
    if (!armed) {
      setArmed(true);
      return;
    }

    setArmed(false);
    onConfirm();
  };

  const label = armed ? confirmLabel : children;

  if (icon) {
    return (
      <IconButton $armed={armed} $danger={variant === 'danger'} onClick={onClick} title={title} aria-label={title}>
        {label}
      </IconButton>
    );
  }

  return (
    <Button $variant={variant} $size={size} $armed={armed} onClick={onClick} title={title}>
      {label}
    </Button>
  );
};

export { ConfirmButton };
