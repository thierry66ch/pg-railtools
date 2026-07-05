import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  const variantClass = variant === 'primary' ? '' : ` rt-button--${variant}`;
  return <button className={`rt-button${variantClass}${className ? ` ${className}` : ''}`} {...rest} />;
}
