import type { Metadata } from "next";
import { Header } from "../components/Header/Header";
import { Footer } from "../components/Footer/Footer";
import styles from "../privacy/page.module.css";

export const metadata: Metadata = {
  title: "Terms of Service — CardioGuard",
  description:
    "CardioGuard terms of service. Please read these terms carefully before using our service.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <article className={styles.article}>
          <header className={styles.hero}>
            <h1 className={styles.title}>Terms of Service</h1>
            <p className={styles.updated}>Last updated: June 15, 2025</p>
          </header>

          <div className={styles.content}>
            <section className={styles.section}>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using the CardioGuard application and related
                services (the &quot;Service&quot;), you agree to be bound by these Terms
                of Service (&quot;Terms&quot;). If you do not agree to these Terms, you
                may not access or use the Service.
              </p>
            </section>

            <section className={styles.section}>
              <h2>2. Description of Service</h2>
              <p>
                CardioGuard provides a mobile-based cardiac monitoring platform
                that includes ECG recording, AI-powered analysis via the
                MedGemma model, health event tracking, and clinical decision
                support tools. The Service is designed as a supplementary health
                monitoring tool and is <strong>not a substitute for
                professional medical advice, diagnosis, or treatment</strong>.
              </p>
            </section>

            <section className={styles.section}>
              <h2>3. Medical Disclaimer</h2>
              <p>
                CardioGuard is an assistive technology tool. The AI-generated
                analysis results are informational and should not be considered a
                definitive medical diagnosis. Always seek the advice of a
                qualified healthcare provider with any questions regarding a
                medical condition.
              </p>
              <p>
                <strong>In case of a medical emergency, call your local
                emergency services immediately.</strong> Do not rely solely on
                CardioGuard for emergency medical decisions.
              </p>
            </section>

            <section className={styles.section}>
              <h2>4. User Accounts</h2>
              <ul>
                <li>
                  You must be at least 18 years old to create an account and use
                  the Service.
                </li>
                <li>
                  You are responsible for maintaining the confidentiality of your
                  account credentials.
                </li>
                <li>
                  You agree to provide accurate, current, and complete
                  information during registration.
                </li>
                <li>
                  You are solely responsible for all activities that occur under
                  your account.
                </li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>5. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>
                  Use the Service for any unlawful purpose or in violation of
                  any applicable laws or regulations
                </li>
                <li>
                  Attempt to reverse engineer, decompile, or disassemble any
                  part of the Service
                </li>
                <li>
                  Interfere with or disrupt the integrity or performance of the
                  Service
                </li>
                <li>
                  Access or attempt to access another user&apos;s account without
                  authorization
                </li>
                <li>
                  Use the Service to transmit any malware, viruses, or harmful
                  code
                </li>
                <li>
                  Resell, sublicense, or redistribute the Service without
                  written permission
                </li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>6. Subscription & Billing</h2>
              <h3>6.1 Free Tier</h3>
              <p>
                The Personal plan is provided free of charge with usage
                limitations as described on our Pricing page.
              </p>

              <h3>6.2 Paid Plans</h3>
              <p>
                Paid subscriptions are billed on a monthly or annual basis. You
                may cancel at any time — cancellation takes effect at the end of
                the current billing cycle. No prorated refunds are provided for
                partial billing periods.
              </p>

              <h3>6.3 Price Changes</h3>
              <p>
                We reserve the right to adjust pricing with 30 days&apos; advance
                notice. Continued use of the Service after a price change
                constitutes acceptance of the new pricing.
              </p>
            </section>

            <section className={styles.section}>
              <h2>7. Intellectual Property</h2>
              <p>
                The Service, including all content, features, algorithms, and
                the MedGemma AI integration, is the proprietary property of
                CardioGuard Inc. and is protected by copyright, trademark, and
                other intellectual property laws.
              </p>
              <p>
                You retain ownership of your personal health data. By using the
                Service, you grant us a limited license to process your data
                solely for the purpose of providing the Service.
              </p>
            </section>

            <section className={styles.section}>
              <h2>8. Data Ownership & Portability</h2>
              <p>
                Your health data belongs to you. You may export your data at any
                time through the app&apos;s export features. Upon account deletion,
                we will permanently remove your data from our servers within 30
                days, as detailed in our Privacy Policy.
              </p>
            </section>

            <section className={styles.section}>
              <h2>9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable law, CardioGuard
                Inc. shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages, including but not limited to:
              </p>
              <ul>
                <li>Loss of profits, data, or goodwill</li>
                <li>
                  Service interruptions or device connectivity issues
                </li>
                <li>
                  Inaccuracies in AI analysis results
                </li>
                <li>
                  Any health outcomes related to use or non-use of the Service
                </li>
              </ul>
              <p>
                Our total liability shall not exceed the amount you have paid to
                us in the 12 months preceding the claim.
              </p>
            </section>

            <section className={styles.section}>
              <h2>10. Warranty Disclaimer</h2>
              <p>
                The Service is provided &quot;as is&quot; and &quot;as available&quot; without
                warranties of any kind, either express or implied, including but
                not limited to implied warranties of merchantability, fitness
                for a particular purpose, and non-infringement.
              </p>
            </section>

            <section className={styles.section}>
              <h2>11. Termination</h2>
              <p>
                We may suspend or terminate your access to the Service at any
                time for violation of these Terms or for any reason at our sole
                discretion with reasonable notice. You may terminate your account
                at any time through the app settings.
              </p>
            </section>

            <section className={styles.section}>
              <h2>12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance
                with the laws of the State of California, United States, without
                regard to its conflict of law provisions. Any disputes shall be
                resolved in the courts of San Francisco County, California.
              </p>
            </section>

            <section className={styles.section}>
              <h2>13. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Material
                changes will be communicated via email or in-app notification at
                least 30 days before they take effect. Continued use of the
                Service constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className={styles.section}>
              <h2>14. Contact</h2>
              <p>
                If you have questions about these Terms, please contact us:
              </p>
              <ul>
                <li>
                  Email:{" "}
                  <a href="mailto:legal@cardioguard.ai">
                    legal@cardioguard.ai
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
