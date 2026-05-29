import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "glass-card shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
