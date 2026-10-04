"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 16 },
  },
};

interface BentoGridShowcaseProps {
  /** Tall card spanning two rows. */
  integration: React.ReactNode;
  trackers: React.ReactNode;
  statistic: React.ReactNode;
  focus: React.ReactNode;
  productivity: React.ReactNode;
  className?: string;
}

/** Five-slot bento grid: one tall card beside four small cards. */
export const BentoGridShowcase = ({
  integration,
  trackers,
  statistic,
  focus,
  productivity,
  className,
}: BentoGridShowcaseProps) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className={cn(
        "grid w-full auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1 lg:row-span-2">
        {integration}
      </motion.div>
      <motion.div variants={itemVariants}>{trackers}</motion.div>
      <motion.div variants={itemVariants}>{statistic}</motion.div>
      <motion.div variants={itemVariants}>{focus}</motion.div>
      <motion.div variants={itemVariants}>{productivity}</motion.div>
    </motion.div>
  );
};
