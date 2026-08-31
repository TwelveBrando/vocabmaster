import * as React from 'react';
import { cn } from '@/lib/utils';

interface FlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: React.ReactNode;
}

/** Primary CTA; the Prisma theme supplies its expanding-flow animation. */
export function FlowButton({ text, className, type = 'button', ...props }: FlowButtonProps) {
  return (
    <button type={type} className={cn('flow-button group relative inline-flex items-center justify-center gap-1 overflow-hidden', className)} {...props}>
      <span className="flow-button__label relative z-[1]">{text}</span>
      <span aria-hidden="true" className="flow-button__fill absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0" />
    </button>
  );
}
