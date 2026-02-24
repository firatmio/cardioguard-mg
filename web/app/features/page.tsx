import type { Metadata } from "next";
import Image from "next/image";
import { Header } from "../components/Header/Header";
import { Footer } from "../components/Footer/Footer";
import styles from "./page.module.css";
import {
  Activity,
  Brain,
  ShieldAlert,
  Stethoscope,
  Wifi,
  BellRing,
  ChartLine,
  Lock,
  Smartphone,
  Database,
  RefreshCw,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features — CardioGuard",
  description:
    "Explore CardioGuard's complete suite of cardiac monitoring features powered by MedGemma AI.",
};

const featureGroups = [
  {
    category: "Monitoring",
    features: [
      {
        icon: <Activity size={24} />,
        title: "Real-Time ECG Capture",
        description:
          "Continuous 10-second segment recording at clinical-grade sample rates. Data is captured via BLE from your wearable device and stored securely on-device.",
        image: "/path/to/feature-ecg-capture.png",
      },
      {
        icon: <ChartLine size={24} />,
        title: "Live Waveform Visualization",
        description:
          "Watch your ECG waveform in real-time with SVG rendering. Signal quality indicators ensure you're getting reliable data at all times.",
        image: "/path/to/feature-waveform.png",
      },
      {
        icon: <Smartphone size={24} />,
        title: "Device Management",
        description:
          "Seamless BLE device pairing with automatic reconnection. Monitor battery level, signal strength, and connection status at a glance.",
        image: "/path/to/feature-device.png",
      },
    ],
  },
  {
    category: "Intelligence",
    features: [
      {
        icon: <Brain size={24} />,
        title: "MedGemma AI Analysis",
        description:
          "Each ECG segment is analyzed by Google's MedGemma clinical AI model. Detects 15+ anomaly types including atrial fibrillation, ventricular tachycardia, and ST-segment changes.",
        image: "/path/to/feature-ai-analysis.png",
      },
      {
        icon: <ShieldAlert size={24} />,
        title: "Predictive Early Warning",
        description:
          "Machine learning models identify subtle pattern changes that precede cardiac events, providing alerts minutes to hours before symptoms appear.",
        image: "/path/to/feature-early-warning.png",
      },
      {
        icon: <Stethoscope size={24} />,
        title: "Clinical Decision Support",
        description:
          "Comprehensive analysis reports with annotated ECG segments, severity classification, and recommended actions — designed for clinical workflow integration.",
        image: "/path/to/feature-clinical-support.png",
      },
    ],
  },
  {
    category: "Infrastructure",
    features: [
      {
        icon: <Wifi size={24} />,
        title: "Offline-First Architecture",
        description:
          "SQLite-based local storage with WAL journal mode ensures zero data loss. Full monitoring capability without internet — data syncs when connectivity returns.",
        image: "/path/to/feature-offline.png",
      },
      {
        icon: <BellRing size={24} />,
        title: "Intelligent Notifications",
        description:
          "Severity-based push notifications that escalate appropriately. Info, warning, urgent, and critical alerts — each with tailored patient guidance.",
        image: "/path/to/feature-notifications.png",
      },
      {
        icon: <Lock size={24} />,
        title: "Enterprise Security",
        description:
          "End-to-end encryption for data in transit and at rest. HIPAA compliant, GDPR ready, with SOC 2 Type II certification in progress.",
        image: "/path/to/feature-security.png",
      },
      {
        icon: <Database size={24} />,
        title: "Smart Sync Queue",
        description:
          "Automatic background synchronization with retry logic and exponential backoff. No manual intervention required — your data is always up to date.",
        image: "/path/to/feature-sync.png",
      },
      {
        icon: <RefreshCw size={24} />,
        title: "Data Retention Management",
        description:
          "Configurable retention policies automatically prune old synced data while preserving unsynced records indefinitely until upload completes.",
        image: "/path/to/feature-retention.png",
      },
      {
        icon: <FileText size={24} />,
        title: "Export & Integration",
        description:
          "Export recording sessions and clinical events in standard formats. REST API for EHR integration and custom healthcare system connectivity.",
        image: "/path/to/feature-export.png",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.badge}>Features</span>
            <h1 className={styles.heroTitle}>
              A complete platform for
              <br />
              <span className="gradient">cardiac monitoring</span>
            </h1>
            <p className={styles.heroSubtitle}>
              From raw ECG data capture to AI-powered clinical insights — every
              feature is designed with patient safety and clinical accuracy in mind.
            </p>
          </div>
        </section>

        {/* Feature Groups */}
        {featureGroups.map((group, gi) => (
          <section key={gi} className={styles.section}>
            <div className={styles.groupHeader}>
              <span className="sectionLabel">{group.category}</span>
            </div>
            <div className={styles.featuresGrid}>
              {group.features.map((feature, fi) => (
                <div key={fi} className={styles.featureCard}>
                  <div className={styles.featureContent}>
                    <div className={styles.featureIcon}>{feature.icon}</div>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDesc}>{feature.description}</p>
                  </div>
                  <div className={styles.featureImage}>
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      width={560}
                      height={350}
                      className={styles.featureImg}
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={75}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
