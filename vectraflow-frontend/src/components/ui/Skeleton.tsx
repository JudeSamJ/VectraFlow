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
