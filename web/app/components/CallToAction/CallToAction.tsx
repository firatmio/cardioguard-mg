"use client";

import styles from "./CallToAction.module.css";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";

export const CallToAction = () => {
  return (
    <section className={styles.section}>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
      >
        <div className={styles.glow} />

        <Heart size={32} className={styles.icon} />

        <h2 className={styles.title}>
          Start protecting your heart
          <br />
          <span className="gradient">with AI-powered monitoring</span>
        </h2>

        <p className={styles.subtitle}>
          Join thousands of patients and clinicians who trust CardioGuard for
          continuous cardiac surveillance. Free to start, no credit card
          required.
        </p>

        <div className={styles.actions}>
          <Link href="/download" className={styles.primaryBtn}>
            Download CardioGuard
            <ArrowRight size={16} />
          </Link>
          <Link href="/contact" className={styles.secondaryBtn}>
            Talk to Sales
          </Link>
        </div>
      </motion.div>
    </section>
  );
};
