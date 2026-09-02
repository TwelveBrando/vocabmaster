import { LiquidMetal, liquidMetalPresets } from '@paper-design/shaders-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LiquidMetalHeroProps {
  badge?: string;
  title: string;
  subtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel?: string;
  onPrimaryCtaClick: () => void;
  onSecondaryCtaClick?: () => void;
  features?: string[];
  shaderMaxPixelCount?: number;
  shaderMinPixelRatio?: number;
  prefersReducedMotion?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.15 } },
};

const itemVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const buttonVariants = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } };

export default function LiquidMetalHero({
  badge,
  title,
  subtitle,
  primaryCtaLabel,
  secondaryCtaLabel,
  onPrimaryCtaClick,
  onSecondaryCtaClick,
  features = [],
  shaderMaxPixelCount,
  shaderMinPixelRatio,
  prefersReducedMotion = false,
}: LiquidMetalHeroProps) {
  return (
    <section className="liquid-metal-hero relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <LiquidMetal
        {...liquidMetalPresets[2].params}
        colorBack="#080808"
        colorTint="#e7e7e4"
        speed={prefersReducedMotion ? 0 : 0.42}
        minPixelRatio={shaderMinPixelRatio}
        maxPixelCount={shaderMaxPixelCount}
        className="liquid-metal-backdrop"
        style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-black/45" />
      <div className="container relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="space-y-8 text-center" variants={containerVariants} initial="hidden" animate="visible" transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}>
          {badge && <motion.div className="flex justify-center" variants={itemVariants}><Badge variant="secondary" className="border-foreground/20 bg-foreground/10 text-foreground backdrop-blur-sm transition-colors duration-300 hover:bg-foreground/20">{badge}</Badge></motion.div>}
          <motion.div className="space-y-6" variants={itemVariants}>
            <motion.h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl lg:text-7xl xl:text-8xl" variants={itemVariants}>{title}</motion.h1>
            <motion.p className="mx-auto max-w-3xl text-xl leading-relaxed text-foreground/90 sm:text-2xl" variants={itemVariants}>{subtitle}</motion.p>
          </motion.div>
          <motion.div className="flex flex-col items-center justify-center gap-4 sm:flex-row" variants={buttonVariants}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><Button onClick={onPrimaryCtaClick} size="lg" className="bg-foreground px-8 py-6 text-lg font-semibold text-background shadow-2xl transition-all duration-300 hover:bg-foreground/90">{primaryCtaLabel}</Button></motion.div>
            {secondaryCtaLabel && onSecondaryCtaClick && <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><Button onClick={onSecondaryCtaClick} variant="outline" size="lg" className="border-foreground/30 px-8 py-6 text-lg font-semibold text-foreground backdrop-blur-sm transition-all duration-300 hover:border-foreground/50 hover:bg-foreground/10">{secondaryCtaLabel}</Button></motion.div>}
          </motion.div>
          {features.length > 0 && <motion.div className="pt-12" variants={itemVariants}><motion.div whileHover={{ y: -4 }} transition={{ duration: 0.3 }}><Card className="border-foreground/20 bg-foreground/10 shadow-2xl backdrop-blur-md"><div className="p-8"><div className="grid grid-cols-1 gap-6 md:grid-cols-3">{features.map((feature, index) => <motion.p key={feature} className="text-center text-lg font-medium text-foreground/90" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}>{feature}</motion.p>)}</div></div></Card></motion.div></motion.div>}
        </motion.div>
      </div>
    </section>
  );
}
