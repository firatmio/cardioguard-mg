"use client";

import styles from "./AppShowcase.module.css";
import Image from "next/image";
import { motion } from "framer-motion";

const screens = [
  {
    title: "Dashboard",
    description: "At-a-glance cardiac health overview with real-time BPM and daily metrics",
    image: "/in-app-screen.png",
  },
  {
    title: "ECG Monitor",
    description: "Live ECG waveform visualization with signal quality indicators",
    image: "/in-app-screen-2.png",
  },
  {
    title: "Health History",
    description: "Complete recording sessions and clinical event timeline",
    image: "/in-app-screen-3.png",
  },
  {
    title: "Device Management",
    description: "Seamless BLE device pairing with battery and connection status",
    image: "/in-app-screen-4.png",
  },
];

export const AppShowcase = () => {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <motion.span
          className="sectionLabel"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          App Preview
        </motion.span>
        <motion.h2
          className="sectionTitle"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
        >
          Designed for clarity
          <br />
          when every second counts
        </motion.h2>
        <motion.p
          className="sectionSubtitle"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          A clinical-grade interface that patients can understand at a glance
          and doctors can trust for decision support.
        </motion.p>
      </div>

      <div className={styles.grid}>
        {screens.map((screen, i) => (
          <motion.div
            key={i}
            className={styles.card}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch} />
              <Image
                src={screen.image}
                alt={screen.title}
                width={360}
                height={800}
                className={styles.phoneImg}
                loading="lazy"
                sizes="(max-width: 480px) 45vw, (max-width: 900px) 40vw, 240px"
                quality={75}
              />
            </div>
            <div className={styles.cardText}>
              <h3 className={styles.cardTitle}>{screen.title}</h3>
              <p className={styles.cardDesc}>{screen.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
