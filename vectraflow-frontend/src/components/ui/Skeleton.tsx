<<<<<<< HEAD
import { type HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
}

export function Skeleton({ width, height = 16, style, ...props }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      {...props}
      style={{ width, height, ...style }}
    />
  );
}
=======
import React from 'react';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ style, className = '', ...rest }) => (
  <div
    className={`shimmer ${className}`}
    style={{ borderRadius: 'var(--radius-md)', ...style }}
    {...rest}
  />
);
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
