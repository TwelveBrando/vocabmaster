import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RandomLetterSwapProps {
  label: string;
  className?: string;
  staggerDuration?: number;
}

export function RandomLetterSwap({ label, className, staggerDuration = 0.025 }: RandomLetterSwapProps) {
  const [cycle, setCycle] = useState(0);

  return (
    <span className={cn('random-letter-swap inline-flex', className)} onMouseEnter={() => setCycle((value) => value + 1)} aria-label={label}>
      {[...label].map((character, index) => (
        <span aria-hidden="true" className="relative inline-block h-[1.15em] overflow-hidden align-bottom" key={index}>
          <span className="invisible">{character === ' ' ? '\u00a0' : character}</span>
          <motion.span
            className="absolute inset-x-0 top-0 block h-full"
            key={cycle}
            initial={{ y: '0%' }}
            animate={{ y: cycle ? '145%' : '0%' }}
            transition={{ duration: 0.6, type: 'spring', delay: index * staggerDuration }}
          >
            <span className="absolute inset-x-0" style={{ top: '-145%' }}>{character === ' ' ? '\u00a0' : character}</span>
            <span className="absolute inset-x-0 top-0">{character === ' ' ? '\u00a0' : character}</span>
          </motion.span>
        </span>
      ))}
    </span>
  );
}
