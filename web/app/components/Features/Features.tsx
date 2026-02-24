"use client";

import styles from "./Features.module.css";
import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  ShieldAlert,
  Stethoscope,
  Wifi,
  BellRing,
  ChartLine,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: <Activity size={22} />,
    title: "Real-Time ECG Monitoring",
    description:
      "Continuous 12-lead equivalent ECG tracking from BLE-connected wearable devices with clinical-grade precision.",
    color: "var(--success)",
  },
  {
    icon: <Brain size={22} />,
    title: "MedGemma AI Analysis",
    description:
      "Google's multimodal clinical intelligence analyzes ECG patterns, detecting arrhythmias, ST-segment changes, and subtle anomalies.",
    color: "var(--primary-light)",
  },
  {
    icon: <ShieldAlert size={22} />,
    title: "Early Warning System",
    description:
      "Predictive algorithms detect potential cardiac events minutes to hours before symptoms appear, enabling proactive intervention.",
    color: "var(--danger)",
  },
  {
    icon: <Stethoscope size={22} />,
    title: "Clinical Decision Support",
    description:
      "Detailed reports shared with your healthcare provider to accelerate diagnosis and streamline clinical workflows.",
    color: "var(--info)",
  },
  {
    icon: <Wifi size={22} />,
    title: "Offline-First Architecture",
    description:
      "Full functionality even without internet. Data syncs automatically when connectivity is restored — no gaps in monitoring.",
    color: "var(--warning)",
  },
  {
    icon: <BellRing size={22} />,
    title: "Smart Notifications",
    description:
      "Severity-based alert system that notifies patients and doctors at the right time with the right level of urgency.",
    color: "var(--primary-light)",
  },
  {
    icon: <ChartLine size={22} />,
    title: "Health Trends & History",
    description:
      "Comprehensive recording sessions, event history, and trend analysis — track your cardiac health over weeks and months.",
    color: "var(--success)",
  },
  {
    icon: <Lock size={22} />,
    title: "HIPAA & GDPR Compliant",
    description:
      "End-to-end encryption, local-first storage, and strict compliance with healthcare data regulations worldwide.",
    color: "var(--text-muted)",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export const Features = () => {
  return (
    <section className={styles.section} id="features">
      <div className={styles.header}>
        <motion.span
          className="sectionLabel"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Features
        </motion.span>
        <motion.h2
          className="sectionTitle"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
        >
          Everything you need to monitor
          <br />
          cardiac health with confidence
        </motion.h2>
        <motion.p
          className="sectionSubtitle"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Built for patients and clinicians — a complete ecosystem from data
          collection to clinical decision support.
        </motion.p>
      </div>

      <motion.div
        className={styles.grid}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {features.map((feature, i) => (
          <motion.div key={i} className={styles.card} variants={cardVariants}>
            <div
              className={styles.iconWrap}
              style={{ color: feature.color }}
            >
              {feature.icon}
            </div>
            <h3 className={styles.cardTitle}>{feature.title}</h3>
            <p className={styles.cardDesc}>{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};
