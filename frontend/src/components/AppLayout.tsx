import { motion } from 'framer-motion';
import type { PropsWithChildren } from 'react';
import { Footer } from './Footer';
import { MedCoachWidget } from './MedCoachWidget';
import { Navbar } from './Navbar';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_right,_rgba(22,166,121,0.14),_transparent_36%),radial-gradient(circle_at_top_left,_rgba(25,125,255,0.2),_transparent_32%)]" />
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 pb-28 pt-6 sm:pb-32"
      >
        {children}
      </motion.main>
      <Footer />
      <MedCoachWidget />
    </div>
  );
}
