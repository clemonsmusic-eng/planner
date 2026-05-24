import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const base =
    'bg-white rounded-2xl shadow-sm border border-ios-gray-200';
  const interactive = onClick ? 'cursor-pointer active:opacity-70 transition-opacity' : '';
  return (
    <div
      className={`${base} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </div>
  );
}
