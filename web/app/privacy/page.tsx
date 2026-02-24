import type { Metadata } from "next";
import { Header } from "../components/Header/Header";
import { Footer } from "../components/Footer/Footer";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy — CardioGuard",
  description:
    "CardioGuard privacy policy. Learn how we collect, use, and protect your personal and health data.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <article className={styles.article}>
          <header className={styles.hero}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.updated}>Last updated: June 15, 2025</p>
          </header>

          <div className={styles.content}>
            <section className={styles.section}>
              <h2>1. Introduction</h2>
              <p>
                CardioGuard (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
                protecting your privacy. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you
                use our mobile application and related services (collectively,
                the &quot;Service&quot;).
              </p>
              <p>
                By using the Service, you agree to the collection and use of
                information in accordance with this policy. If you do not agree
                with the terms of this policy, please do not access the Service.
              </p>
            </section>

            <section className={styles.section}>
              <h2>2. Information We Collect</h2>
              <h3>2.1 Personal Information</h3>
              <p>We may collect the following personal information:</p>
              <ul>
                <li>Name and email address (account registration)</li>
                <li>Date of birth and gender (health profile)</li>
                <li>Device identifiers and IP address</li>
                <li>Usage analytics and app interaction data</li>
              </ul>

              <h3>2.2 Health Data</h3>
              <p>
                CardioGuard collects sensitive health data to provide its core
                monitoring services:
              </p>
              <ul>
                <li>ECG waveform recordings and heart rate measurements</li>
                <li>AI analysis results and anomaly classifications</li>
                <li>Health event history and alert records</li>
                <li>Device connection and sensor metadata</li>
              </ul>
              <p>
                Health data is classified as <strong>Protected Health Information
                (PHI)</strong> under HIPAA and <strong>Special Category
                Data</strong> under GDPR. We apply the highest level of
                protection to this data.
              </p>
            </section>

            <section className={styles.section}>
              <h2>3. How We Use Your Information</h2>
              <ul>
                <li>Provide, maintain, and improve the CardioGuard service</li>
                <li>Perform AI-based ECG analysis via the MedGemma model</li>
                <li>Send health alerts and notifications</li>
                <li>Generate clinical reports and health trends</li>
                <li>Ensure service security and prevent fraud</li>
                <li>Comply with legal and regulatory obligations</li>
                <li>
                  Conduct anonymized, aggregated research to improve detection
                  accuracy (with your consent)
                </li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>4. Data Storage & Security</h2>
              <h3>4.1 Local Storage</h3>
              <p>
                CardioGuard uses an offline-first architecture. Your ECG data is
                stored locally on your device using encrypted SQLite databases
                with WAL journal mode. This ensures data availability even
                without internet connectivity.
              </p>

              <h3>4.2 Cloud Synchronization</h3>
              <p>
                When you enable cloud sync, data is transmitted using TLS 1.3
                encryption and stored in encrypted form on our servers.
                Synchronization uses a background queue with automatic retry
                logic — no data is lost during connectivity interruptions.
              </p>

              <h3>4.3 Security Measures</h3>
              <ul>
                <li>AES-256 encryption at rest</li>
                <li>TLS 1.3 encryption in transit</li>
                <li>Regular security audits and penetration testing</li>
                <li>SOC 2 Type II certification (in progress)</li>
                <li>Role-based access controls for staff</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>5. HIPAA Compliance</h2>
              <p>
                CardioGuard is designed to comply with the Health Insurance
                Portability and Accountability Act (HIPAA). We implement
                administrative, physical, and technical safeguards to protect
                PHI. For enterprise customers, we offer Business Associate
                Agreements (BAAs) upon request.
              </p>
            </section>

            <section className={styles.section}>
              <h2>6. GDPR Rights (EEA Users)</h2>
              <p>
                If you are located in the European Economic Area, you have the
                following rights under the General Data Protection Regulation:
              </p>
              <ul>
                <li>
                  <strong>Right of Access</strong> — Request copies of your
                  personal data
                </li>
                <li>
                  <strong>Right to Rectification</strong> — Request correction of
                  inaccurate data
                </li>
                <li>
                  <strong>Right to Erasure</strong> — Request deletion of your
                  data (&quot;right to be forgotten&quot;)
                </li>
                <li>
                  <strong>Right to Restrict Processing</strong> — Request
                  limitation of data processing
                </li>
                <li>
                  <strong>Right to Data Portability</strong> — Request transfer
                  of your data in a machine-readable format
                </li>
                <li>
                  <strong>Right to Object</strong> — Object to processing based
                  on legitimate interests
                </li>
              </ul>
              <p>
                To exercise any of these rights, please contact us at{" "}
                <a href="mailto:privacy@cardioguard.ai">
                  privacy@cardioguard.ai
                </a>
                . We will respond within 30 days.
              </p>
            </section>

            <section className={styles.section}>
              <h2>7. Data Retention</h2>
              <p>
                We retain your personal and health data for as long as your
                account is active or as needed to provide services. Local data
                retention is configurable in the app settings. Upon account
                deletion, all cloud-stored data is permanently erased within 30
                days.
              </p>
            </section>

            <section className={styles.section}>
              <h2>8. Third-Party Services</h2>
              <p>We may share limited data with the following third parties:</p>
              <ul>
                <li>
                  <strong>Google (MedGemma AI)</strong> — ECG data is sent to
                  Google&apos;s MedGemma model for clinical analysis. Data is
                  processed in real-time and not retained by Google.
                </li>
                <li>
                  <strong>Cloud Infrastructure</strong> — Encrypted data is
                  stored on industry-standard cloud providers.
                </li>
                <li>
                  <strong>Analytics</strong> — Anonymized usage data for service
                  improvement. No health data is shared with analytics providers.
                </li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>9. Children&apos;s Privacy</h2>
              <p>
                CardioGuard is not intended for use by individuals under the age
                of 18. We do not knowingly collect personal information from
                children. If you believe we have collected data from a minor,
                please contact us immediately.
              </p>
            </section>

            <section className={styles.section}>
              <h2>10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new policy on this page
                and updating the &quot;Last updated&quot; date. Continued use of the
                Service after changes constitutes acceptance of the updated
                policy.
              </p>
            </section>

            <section className={styles.section}>
              <h2>11. Contact Us</h2>
              <p>
                If you have questions or concerns about this Privacy Policy,
                please contact our Data Protection Officer:
              </p>
              <ul>
                <li>
                  Email:{" "}
                  <a href="mailto:privacy@cardioguard.ai">
                    privacy@cardioguard.ai
                  </a>
                </li>
                <li>Address: CardioGuard Inc., San Francisco, CA, USA</li>
              </ul>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
