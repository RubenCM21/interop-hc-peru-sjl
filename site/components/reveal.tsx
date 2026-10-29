"use client";

import { motion, useReducedMotion } from "motion/react";

export function Reveal({
  children, delay = 0, className, as = "div",
}: { children: React.ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" }) {
  const reducido = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reducido ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
