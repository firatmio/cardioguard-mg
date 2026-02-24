"use client";

import styles from "./Testimonials.module.css";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Cardiologist, Mount Sinai Hospital",
    quote:
      "CardioGuard has fundamentally changed how I monitor my at-risk patients. The AI analysis catches subtle patterns that manual review can miss, and the alerts are clinically actionable.",
    rating: 5,
  },
  {
    name: "James Mitchell",
    role: "Patient, Age 62",
    quote:
      "After my first cardiac event, CardioGuard gave me peace of mind. The app is easy to understand and I know my doctor gets alerted immediately if something is wrong.",
    rating: 5,
  },
  {
    name: "Dr. Priya Patel",
    role: "Internal Medicine, Cleveland Clinic",
    quote:
      "The decision support reports are exceptional. Having continuous ECG data with AI-flagged segments saves me hours per week and improves patient outcomes.",
    rating: 5,
  },
];

export const Testimonials = () => {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <motion.span
          className="sectionLabel"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Testimonials
        </motion.span>
        <motion.h2
          className="sectionTitle"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
        >
          Trusted by clinicians
          <br />
          and patients worldwide
        </motion.h2>
      </div>

      <div className={styles.grid}>
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            className={styles.card}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <Quote size={20} className={styles.quoteIcon} />
            <p className={styles.quote}>{t.quote}</p>
            <div className={styles.stars}>
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} size={14} fill="var(--warning)" color="var(--warning)" />
              ))}
            </div>
            <div className={styles.author}>
              <div className={styles.avatar} />
              <div>
                <div className={styles.name}>{t.name}</div>
                <div className={styles.role}>{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
