"use client";

import styles from "./HowItWorks.module.css";
import { motion } from "framer-motion";
import { Watch, Zap, Brain, BellRing } from "lucide-react";

const steps = [
  {
    icon: <Watch size={24} />,
    step: "01",
    title: "Connect Your Device",
    description:
      "Pair your BLE-enabled wearable device with CardioGuard in seconds. We support all major cardiac monitoring devices.",
  },
  {
    icon: <Zap size={24} />,
    step: "02",
    title: "Continuous Recording",
    description:
      "Your ECG data is captured in real-time at clinical-grade sample rates, stored securely on-device with offline-first architecture.",
  },
  {
    icon: <Brain size={24} />,
    step: "03",
    title: "AI Analysis",
    description:
      "MedGemma AI processes each segment — detecting arrhythmias, ST-changes, and anomalies with 99.2% clinical accuracy.",
  },
  {
    icon: <BellRing size={24} />,
    step: "04",
    title: "Instant Alerts",
    description:
      "When risk is detected, you and your doctor receive severity-based alerts with actionable clinical context.",
  },
];

const stepVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export const HowItWorks = () => {
  return (
    <section className={styles.section} id="how-it-works">
      <div className={styles.header}>
        <motion.span
          className="sectionLabel"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          How It Works
        </motion.span>
        <motion.h2
          className="sectionTitle"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
        >
          From wearable to warning
          <br />
          in four simple steps
        </motion.h2>
      </div>

      <div className={styles.stepsContainer}>
        <div className={styles.timeline} />
        {steps.map((step, i) => (
          <motion.div
            key={i}
            className={styles.stepItem}
            variants={stepVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.1 }}
          >
            <div className={styles.stepLeft}>
              <div className={styles.stepNumber}>{step.step}</div>
              <div className={styles.stepDot} />
            </div>
            <div className={styles.stepContent}>
              <div className={styles.stepIcon}>{step.icon}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
