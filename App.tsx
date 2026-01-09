import React, { useState } from 'react';
import { ThreeScene } from './components/Section/ThreeScene';
import { Loader } from './components/Core/Loader';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-surface-1 text-content-1 font-sans">
      <AnimatePresence>
        {isLoading && (
          <motion.div
             key="loader"
             exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
             className="absolute inset-0 z-50 pointer-events-none"
          >
            <Loader />
          </motion.div>
        )}
      </AnimatePresence>

      <ThreeScene onLoadComplete={() => setIsLoading(false)} />

      {/* Overlay UI */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isLoading ? 0 : 1, y: isLoading ? 20 : 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="absolute bottom-8 left-8 z-10 pointer-events-none select-none"
      >
        <h1 className="font-display text-5xl md:text-7xl leading-none tracking-tight text-content-1 opacity-90">
          LIQUID<br/>MASK
        </h1>
        <div className="mt-4 flex flex-col gap-1">
          <p className="font-mono text-xs text-content-2 tracking-wide uppercase">
            Interaction: Cursor Move
          </p>
          <p className="font-mono text-xs text-content-3 tracking-wide uppercase">
            Three.js &middot; WebGL &middot; React
          </p>
        </div>
      </motion.div>

      {/* Top Right Menu / Credits */}
       <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="absolute top-8 right-8 z-10 pointer-events-none"
      >
         <div className="flex flex-col items-end gap-2">
            <div className="h-[1px] w-12 bg-content-1 opacity-20"></div>
            <span className="font-mono text-[10px] text-content-3 uppercase tracking-widest">
              v1.0.0 &mdash; EXP.
            </span>
         </div>
      </motion.div>
    </div>
  );
};

export default App;