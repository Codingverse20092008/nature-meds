import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="max-w-3xl">
        <span className="badge-pill mb-4">{eyebrow}</span>
        <h1 className="title-display text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-600">{description}</p>
      </div>
      {action}
    </motion.div>
  );
}
