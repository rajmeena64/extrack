import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  variant?: 'default' | 'subtle' | 'interactive' | 'dashed';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

const variantStyles = {
  default: 'bg-[var(--bg-card)] border border-[var(--divider-strong)] rounded-xl shadow-xs',
  subtle: 'bg-[var(--surface-subtle)] border border-[var(--divider-strong)] rounded-lg',
  interactive: 'bg-[var(--bg-card)] border border-[var(--divider-strong)] rounded-xl shadow-xs hover:border-[var(--button-bg)]/60 hover:bg-[var(--surface-subtle)] transition-all cursor-pointer',
  dashed: 'bg-[var(--surface-subtle)] border-2 border-dashed border-[var(--divider-strong)] rounded-xl',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-4 sm:p-6',
  xl: 'p-6 sm:p-8',
};

export function Card({
  as: Component = 'div',
  variant = 'default',
  padding = 'lg',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <Component className={`w-full ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)] flex-nowrap ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={`text-xs sm:text-sm font-semibold text-[var(--heading)] tracking-tight whitespace-nowrap m-0 ${className}`.trim()} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-[var(--text-secondary)] mt-0.5 m-0 ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-end gap-3 pt-4 border-t border-[var(--divider-strong)] flex-wrap ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default Card;
