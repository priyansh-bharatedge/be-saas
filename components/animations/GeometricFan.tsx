"use client";

import { motion } from "framer-motion";

export function GeometricFan() {
  const bladeCount = 12;
  const blades = Array.from({ length: bladeCount }, (_, i) => i);

  return (
    <div className="relative w-full h-[250px] sm:h-[300px] overflow-hidden flex items-end justify-center pointer-events-none select-none">
      {/* Radiant Glow in Background */}
      <div 
        className="absolute -bottom-6 w-[420px] h-[200px] rounded-full blur-2xl opacity-45"
        style={{
          background: "radial-gradient(circle, #F0944D 0%, #ACCAD5 60%, transparent 80%)"
        }}
      />

      {/* SVG Dashed Trajectory Perspective Lines (Ref Image 2) */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1="500"
          y1="320"
          x2="80"
          y2="20"
          stroke="#1F2428"
          strokeOpacity="0.12"
          strokeDasharray="4 6"
          strokeWidth="1.2"
        />
        <line
          x1="500"
          y1="320"
          x2="920"
          y2="20"
          stroke="#1F2428"
          strokeOpacity="0.12"
          strokeDasharray="4 6"
          strokeWidth="1.2"
        />
        <line
          x1="500"
          y1="320"
          x2="280"
          y2="10"
          stroke="#1F2428"
          strokeOpacity="0.09"
          strokeDasharray="3 5"
          strokeWidth="1"
        />
        <line
          x1="500"
          y1="320"
          x2="720"
          y2="10"
          stroke="#1F2428"
          strokeOpacity="0.09"
          strokeDasharray="3 5"
          strokeWidth="1"
        />
      </svg>

      {/* Geometric Fan Spiral Blades */}
      <div className="relative w-[340px] sm:w-[400px] h-[240px] sm:h-[280px] flex items-center justify-center">
        {blades.map((index) => {
          const rotation = index * 14 - 40;
          const scale = 0.88 + index * 0.03;
          const opacity = 0.6 + (index / bladeCount) * 0.4;
          const zIndex = index + 1;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, rotate: rotation - 15, scale: scale * 0.9 }}
              animate={{ opacity: opacity, rotate: rotation, scale: scale }}
              transition={{
                duration: 0.8,
                delay: index * 0.035,
                ease: "easeOut",
              }}
              style={{
                position: "absolute",
                width: "200px",
                height: "200px",
                bottom: "-10px",
                transformOrigin: "bottom center",
                zIndex,
                borderRadius: "16px",
                background: `linear-gradient(${135 + index * 5}deg, rgba(240, 148, 77, 0.95) 0%, rgba(228, 181, 146, 0.75) 50%, rgba(172, 202, 213, 0.35) 100%)`,
                boxShadow: "0 10px 25px -8px rgba(240, 148, 77, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(6px)",
              }}
            >
              <div className="w-full h-full p-3 flex flex-col justify-between opacity-30">
                <div className="w-5 h-5 border-t border-l border-white/60" />
                <div className="w-full border-b border-dashed border-white/40" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default GeometricFan;
