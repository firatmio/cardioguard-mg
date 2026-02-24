import type { Metadata } from "next";
import Image from "next/image";
import { Header } from "../components/Header/Header";
import { Footer } from "../components/Footer/Footer";
import styles from "./page.module.css";
import { Heart, Target, Globe, Users, Shield, Brain } from "lucide-react";

export const metadata: Metadata = {
  title: "About — CardioGuard",
  description:
    "Learn about CardioGuard's mission to democratize cardiac monitoring with AI-powered technology.",
};

const values = [
  {
    icon: <Heart size={22} />,
    title: "Patient First",
    description:
      "Every design decision prioritizes patient safety and comprehension. Clinical data presented in human-understandable language.",
  },
  {
    icon: <Shield size={22} />,
    title: "Clinical Rigor",
    description:
      "Built to healthcare standards. HIPAA compliant, GDPR ready, and designed for FDA pathway clearance.",
  },
  {
    icon: <Globe size={22} />,
    title: "Global Access",
    description:
      "Cardiac monitoring shouldn't be a privilege. We're building for worldwide accessibility across devices and networks.",
  },
  {
    icon: <Brain size={22} />,
    title: "AI Transparency",
    description:
      "Our AI explains its reasoning. Every alert includes clinical context so physicians can validate findings independently.",
  },
];

const team = [
  { name: "Dr. Emily Zhao", role: "Chief Medical Officer", image: "/path/to/team-cmo.png" },
  { name: "Alex Rivera", role: "CEO & Co-founder", image: "/path/to/team-ceo.png" },
  { name: "Dr. Raj Malhotra", role: "Head of AI Research", image: "/path/to/team-ai.png" },
  { name: "Sarah Lindqvist", role: "VP of Engineering", image: "/path/to/team-eng.png" },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.badge}>About CardioGuard</span>
            <h1 className={styles.heroTitle}>
              Making cardiac monitoring
              <br />
              <span className="gradient">accessible to everyone</span>
            </h1>
            <p className={styles.heroSubtitle}>
              We believe that early detection of cardiac anomalies should not
              depend on geography, income, or access to specialized care. CardioGuard
              brings clinical-grade AI monitoring to every patient, anywhere in the world.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className={styles.section}>
          <div className={styles.splitGrid}>
            <div>
              <span className="sectionLabel">Our Mission</span>
              <h2 className="sectionTitle">
                Prevent cardiac emergencies
                <br />
                before they happen
              </h2>
              <p className={styles.text}>
                Every year, millions of cardiac events go undetected until it&apos;s too
                late. CardioGuard was founded with a single mission: use artificial
                intelligence to bridge the gap between wearable data and clinical
                decision-making.
              </p>
              <p className={styles.text}>
                Our platform combines continuous ECG monitoring from consumer and
                medical-grade wearable devices with MedGemma — Google&apos;s multimodal
                clinical AI — to detect arrhythmias, ST-segment changes, and other
                anomalies in real-time.
              </p>
            </div>
            <div className={styles.missionImage}>
              <Image
                src="/path/to/about-mission.png"
                alt="CardioGuard Mission"
                className={styles.image}
                width={560}
                height={400}
                loading="lazy"
                quality={75}
              />
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className={styles.section}>
          <div className={styles.techCard}>
            <div className={styles.techBadge}>
              <Brain size={18} />
              <span>Powered by MedGemma AI</span>
            </div>
            <h2 className={styles.techTitle}>
              Clinical intelligence you can trust
            </h2>
            <p className={styles.techDesc}>
              MedGemma is Google&apos;s family of open medical AI models built for
              healthcare applications. CardioGuard leverages MedGemma&apos;s multimodal
              capabilities to analyze ECG waveforms, patient history, and contextual
              data — delivering clinically actionable insights with 99.2% anomaly
              detection accuracy.
            </p>
            <div className={styles.techStats}>
              <div className={styles.techStat}>
                <div className={styles.techStatValue}>99.2%</div>
                <div className={styles.techStatLabel}>Detection Accuracy</div>
              </div>
              <div className={styles.techStat}>
                <div className={styles.techStatValue}>&lt;2s</div>
                <div className={styles.techStatLabel}>Analysis Latency</div>
              </div>
              <div className={styles.techStat}>
                <div className={styles.techStatValue}>15+</div>
                <div className={styles.techStatLabel}>Anomaly Types</div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className={styles.section}>
          <div className={styles.center}>
            <span className="sectionLabel">Our Values</span>
            <h2 className="sectionTitle">Built on principles that matter</h2>
          </div>
          <div className={styles.valuesGrid}>
            {values.map((v, i) => (
              <div key={i} className={styles.valueCard}>
                <div className={styles.valueIcon}>{v.icon}</div>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueDesc}>{v.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className={styles.section}>
          <div className={styles.center}>
            <span className="sectionLabel">Our Team</span>
            <h2 className="sectionTitle">
              Clinicians, engineers, and researchers
            </h2>
            <p className="sectionSubtitle" style={{ margin: "0 auto" }}>
              A multidisciplinary team united by a shared belief that technology
              can save lives when built with clinical expertise.
            </p>
          </div>
          <div className={styles.teamGrid}>
            {team.map((member, i) => (
              <div key={i} className={styles.teamCard}>
                <div className={styles.teamPhoto}>
                  <Image
                    src={member.image}
                    alt={member.name}
                    className={styles.teamImg}
                    width={200}
                    height={200}
                    loading="lazy"
                    quality={75}
                  />
                </div>
                <h3 className={styles.teamName}>{member.name}</h3>
                <p className={styles.teamRole}>{member.role}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
