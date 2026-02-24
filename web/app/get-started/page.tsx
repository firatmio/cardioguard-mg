"use client";

import styles from "./page.module.css";
import { Header } from "../components/Header/Header";
import { Footer } from "../components/Footer/Footer";
import { motion } from "framer-motion";
import {
  Heart,
  Stethoscope,
  User,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const cards = [
  {
    id: "patient",
    icon: <User size={32} />,
    title: "I'm a Patient",
    description:
      "Monitor your heart health with AI-powered ECG analysis. Get real-time alerts and share reports with your doctor.",
    features: [
      "Free personal monitoring",
      "AI-powered ECG analysis",
      "Instant health alerts",
      "Share reports with your doctor",
    ],
    cta: "Download the App",
    href: "/download",
    color: "var(--primary)",
    position: "left",
  },
  {
    id: "doctor",
    icon: <Stethoscope size={32} />,
    title: "I'm a Healthcare Professional",
    description:
      "Manage multiple patients, access clinical-grade reports, and integrate with your existing EHR systems.",
    features: [
      "Multi-patient dashboard",
      "Clinical report export",
      "EHR integration & API access",
      "Dedicated account support",
    ],
    cta: "View Plans & Pricing",
    href: "/pricing",
    color: "var(--success)",
    position: "right",
  },
];

export default function GetStartedPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.hero}>
          <motion.div
            className={styles.heroInner}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <div className={styles.iconWrap}>
              <Heart size={24} fill="var(--danger)" stroke="none" />
            </div>
            <h1 className={styles.heroTitle}>
              Welcome to <span className="gradient">CardioGuard</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Tell us about yourself so we can get you to the right place.
            </p>
          </motion.div>
        </section>

        <section className={styles.cardsSection}>
          <div className={styles.cardsGrid}>
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
              >
                <Link href={card.href} className={`${styles.card} ${styles[card.position]}`}>
                  <div
                    className={styles.cardIcon}
                    style={{ color: card.color }}
                  >
                    {card.icon}
                  </div>
                  <h2 className={styles.cardTitle}>{card.title}</h2>
                  <p className={styles.cardDesc}>{card.description}</p>

                  <ul className={styles.featureList}>
                    {card.features.map((f, fi) => (
                      <li key={fi} className={styles.featureItem}>
                        <ShieldCheck size={14} className={styles.featureCheck} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <span
                    className={styles.cardCta}
                    style={{
                      background: card.color,
                      borderColor: card.color,
                    }}
                  >
                    {card.cta}
                    <ArrowRight size={15} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className={styles.note}>
          <p className={styles.noteText}>
            Not sure which option fits you?{" "}
            <Link href="/contact" className={styles.noteLink}>
              Contact our team
            </Link>{" "}
            and we&apos;ll help you get started.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
