import React, { type ComponentPropsWithoutRef, type FC, type ReactNode } from 'react';
import { cx } from '@/utils/cx';

export const badgeVariants = {
  default: 'bg-[#2E90FA]/15 text-[#2E90FA] border border-[#2E90FA]/30 hover:bg-[#2E90FA]/25',
  secondary: 'bg-white/10 text-slate-200 border border-white/10 hover:bg-white/15',
  destructive: 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/20',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20',
  outline: 'border border-white/20 text-white hover:bg-white/5',
  brand: 'bg-[#2E90FA]/10 text-[#2E90FA] border border-[#2E90FA]/20 uppercase tracking-wider font-bold',
};

const colorMap: Record<string, keyof typeof badgeVariants> = {
  gray: 'secondary',
  brand: 'brand',
  error: 'destructive',
  warning: 'warning',
  success: 'success',
  blue: 'default',
};

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  children?: ReactNode;
  variant?: keyof typeof badgeVariants;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const Badge: FC<BadgeProps> = ({
  children,
  variant,
  color,
  size = 'sm',
  className = '',
  ...props
}) => {
  const resolved = variant || (color ? colorMap[color] || 'secondary' : 'default');
  const sizeClasses = size === 'lg' ? 'px-3.5 py-1.5 text-xs' : size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';
  return (
    <span className={cx('inline-flex items-center justify-center font-semibold rounded-full transition-colors whitespace-nowrap', sizeClasses, badgeVariants[resolved] || badgeVariants.default, className)} {...props}>
      {children}
    </span>
  );
};

export const BadgeWithDot: FC<BadgeProps> = ({ children, size = 'sm', color = 'success', variant, className, ...props }) => {
  const dotColor = color === 'success' ? 'bg-emerald-500' : color === 'gray' ? 'bg-gray-500' : 'bg-[#2E90FA]';
  return (
    <Badge size={size} variant={variant} color={color} className={cx('gap-1.5', className)} {...props}>
      <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} aria-hidden="true" />
      {children}
    </Badge>
  );
};

export default Badge;
