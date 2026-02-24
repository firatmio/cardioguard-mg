import styles from "./Hero.module.css";
import Link from "next/link";
import Image from "next/image";
import { Shield, ArrowRight, Play } from "lucide-react";

export const Hero = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        {/* Content — CSS animations, no JS render delay */}
        <div className={styles.content}>
          <div className={`${styles.badge} ${styles.animFadeUp}`} style={{ animationDelay: "0s" }}>
            <Shield size={14} />
            <span>FDA-Ready Clinical Intelligence</span>
          </div>

          <h1 className={`${styles.title} ${styles.animFadeUp}`} style={{ animationDelay: "0.08s" }}>
            Detect cardiac anomalies
            <br />
            <span className={styles.gradient}>before they become emergencies</span>
          </h1>

          <p className={`${styles.subtitle} ${styles.animFadeUp}`} style={{ animationDelay: "0.16s" }}>
            CardioGuard combines continuous ECG monitoring with MedGemma AI to
            provide real-time cardiac analysis, early warnings, and clinical
            decision support — directly on your phone.
          </p>

          <div className={`${styles.actions} ${styles.animFadeUp}`} style={{ animationDelay: "0.24s" }}>
            <Link href="/login" className={styles.primaryBtn}>
              Get Started Free
              <ArrowRight size={16} />
            </Link>
            <Link href="/features" className={styles.secondaryBtn}>
              <Play size={14} />
              See How It Works
            </Link>
          </div>

          <div className={`${styles.trust} ${styles.animFadeUp}`} style={{ animationDelay: "0.32s" }}>
            <div className={styles.trustAvatars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.trustAvatar} />
              ))}
            </div>
            <div className={styles.trustText}>
              <span className={styles.trustHighlight}>10,000+</span> patients
              monitored worldwide
            </div>
          </div>
        </div>

        {/* Phone Mockup — priority image for LCP */}
        <div className={`${styles.mockup} ${styles.animFadeUp}`} style={{ animationDelay: "0.1s" }}>
          <div className={styles.phoneFrame}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              <Image
                src="/in-app-screen.png"
                alt="CardioGuard Dashboard"
                width={540}
                height={1200}
                className={styles.phoneImg}
                priority
                sizes="(max-width: 480px) 220px, 260px"
                quality={80}
              />
            </div>
          </div>

          {/* Floating elements */}
          <div className={`${styles.floatingCard} ${styles.floatingBPM} ${styles.animFloat}`}>
            <div className={styles.floatingDot} />
            <span>72 BPM — Normal</span>
          </div>

          <div className={`${styles.floatingCard} ${styles.floatingAI} ${styles.animFloatAlt}`}>
            <Shield size={14} className={styles.floatingIcon} />
            <span>AI Analysis Active</span>
          </div>
        </div>
      </div>

      {/* Background gradient */}
      <div className={styles.bgGlow} />
      <div className={styles.bgGlow2} />
    </section>
  );
};
