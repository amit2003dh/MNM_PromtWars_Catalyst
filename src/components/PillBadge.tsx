'use client';

import React from 'react';

interface PillBadgeProps {
  color: string;
  shape: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  white: { bg: 'bg-white', border: 'border-slate-300', text: 'text-slate-800' },
  yellow: { bg: 'bg-amber-300', border: 'border-amber-400', text: 'text-amber-900' },
  brown: { bg: 'bg-amber-800', border: 'border-amber-900', text: 'text-amber-100' },
  peach: { bg: 'bg-orange-200', border: 'border-orange-300', text: 'text-orange-900' },
  blue: { bg: 'bg-sky-400', border: 'border-sky-500', text: 'text-sky-950' },
  red: { bg: 'bg-rose-400', border: 'border-rose-500', text: 'text-rose-950' },
  green: { bg: 'bg-emerald-400', border: 'border-emerald-500', text: 'text-emerald-950' },
};

export default function PillBadge({ color, shape, size = 'md', className = '' }: PillBadgeProps) {
  const normColor = color.toLowerCase();
  const palette = COLOR_MAP[normColor] || {
    bg: 'bg-slate-200',
    border: 'border-slate-300',
    text: 'text-slate-800',
  };

  const isCapsule = shape.toLowerCase().includes('capsule');
  const isOval = shape.toLowerCase().includes('oval');
  const isRound = shape.toLowerCase().includes('round');

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-7 h-7 text-xs',
    lg: 'w-10 h-10 text-sm font-bold',
  }[size];

  const shapeClasses = isCapsule
    ? 'rounded-full scale-x-125'
    : isOval
    ? 'rounded-[40%]'
    : isRound
    ? 'rounded-full'
    : 'rounded-md';

  return (
    <div
      className={`inline-flex items-center justify-center border shadow-sm transition-transform hover:scale-110 ${palette.bg} ${palette.border} ${shapeClasses} ${sizeClasses} ${className}`}
      title={`${color} ${shape}`}
      aria-label={`${color} ${shape} pill`}
    >
      <span className="sr-only">
        {color} {shape}
      </span>
      <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
    </div>
  );
}
