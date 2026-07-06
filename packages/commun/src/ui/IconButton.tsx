import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  /** Utilisé à la fois comme infobulle (survol) et libellé accessible. */
  label: string;
  icon: ReactNode;
}

/** Bouton icône seule, avec infobulle native au survol (attribut `title`). */
export function IconButton({ variant = 'secondary', label, icon, className, ...rest }: IconButtonProps) {
  const variantClass = variant === 'primary' ? '' : ` rt-icon-button--${variant}`;
  return (
    <button
      type="button"
      className={`rt-icon-button${variantClass}${className ? ` ${className}` : ''}`}
      title={label}
      aria-label={label}
      {...rest}
    >
      {icon}
    </button>
  );
}
