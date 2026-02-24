"use client";

import styles from "./Stats.module.css";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

const AnimatedNumber = ({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
}: AnimatedNumberProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState("0");
  const motionVal = useMotionValue(0);

  useEffect(() => {
    if (!isInView) return;
    const unsubscribe = motionVal.on("change", (v) => {
      setDisplay(v.toFixed(decimals));
    });
    animate(motionVal, value, { duration: 2, ease: "easeOut" });
    return () => unsubscribe();
  }, [isInView, value, decimals, motionVal]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

const stats = [
  {
    value: 99.2,
    suffix: "%",
    decimals: 1,
    label: "Detection Accuracy",
    description: "Clinically validated anomaly detection rate",
  },
  {
    value: 2,
    prefix: "<",
    suffix: "s",
    label: "Analysis Time",
    description: "Average time from data to clinical insight",
  },
  {
    value: 10,
    suffix: "K+",
    label: "Patients Monitored",
    description: "Active users across 40+ countries",
  },
  {
    value: 24,
    suffix: "/7",
    label: "Continuous Monitoring",
    description: "Uninterrupted cardiac surveillance",
  },
];

export const Stats = () => {
  return (
    <section className={styles.section} id="stats">
      <div className={styles.container}>
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.08 }}
          >
            <div className={styles.value}>
              <AnimatedNumber
                value={stat.value}
                suffix={stat.suffix}
                prefix={stat.prefix || ""}
                decimals={stat.decimals || 0}
              />
            </div>
            <div className={styles.label}>{stat.label}</div>
            <div className={styles.description}>{stat.description}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
