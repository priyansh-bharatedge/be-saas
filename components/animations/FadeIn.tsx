"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  direction = "up",
  className = "",
}: FadeInProps) {
  const getOffset = () => {
    switch (direction) {
      case "up":
        return { y: 16, x: 0 };
      case "down":
        return { y: -16, x: 0 };
      case "left":
        return { x: 16, y: 0 };
      case "right":
        return { x: -16, y: 0 };
      case "none":
      default:
        return { x: 0, y: 0 };
    }
  };

  const offset = getOffset();

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default FadeIn;

