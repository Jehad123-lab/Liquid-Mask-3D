import React from 'react';
import { motion } from 'framer-motion';

export const Loader: React.FC = () => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface-1 text-content-1 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-12 h-12 border-2 border-content-3 border-t-content-1 rounded-full animate-spin" />
        <span className="font-mono text-xs tracking-widest uppercase text-content-2">Loading Assets</span>
      </motion.div>
    </div>
  );
};