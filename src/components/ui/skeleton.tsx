import React from 'react';
import { cx } from '@/utils/cx';

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cx('animate-pulse rounded-md bg-[var(--surface-subtle)]', className)}
      {...props}
    />
  );
}

export default Skeleton;
