import type { Metadata } from "next";
import { Header } from "../components/Header/Header";
import { Footer } from "../components/Footer/Footer";
import styles from "./page.module.css";
import { Mail, MapPin, Clock, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — CardioGuard",
  description:
    "Get in touch with the CardioGuard team. We'd love to hear from you.",
};

const contactInfo = [
  {
    icon: <Mail size={20} />,
    label: "Email",
    value: "hello@cardioguard.ai",
    href: "mailto:hello@cardioguard.ai",
  },
  {
    icon: <MapPin size={20} />,
    label: "Headquarters",
    value: "San Francisco, CA",
    href: null,
  },
  {
    icon: <Clock size={20} />,
    label: "Support Hours",
    value: "Mon–Fri, 9 AM – 6 PM PST",
    href: null,
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.badge}>Contact</span>
            <h1 className={styles.heroTitle}>
              Let&apos;s start a
              <br />
              <span className="gradient">conversation</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Whether you have a question about our platform, pricing, or
              partnerships — our team is ready to help.
            </p>
          </div>
        </section>

        {/* Contact Grid */}
        <section className={styles.contactSection}>
          <div className={styles.contactGrid}>
            {/* Form */}
            <div className={styles.formCard}>
              <h2 className={styles.formTitle}>Send us a message</h2>
              <form className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="firstName">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      className={styles.input}
                      placeholder="John"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="lastName">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      className={styles.input}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className={styles.input}
                    placeholder="john@example.com"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="subject">
                    Subject
                  </label>
                  <select id="subject" className={styles.input}>
                    <option value="">Select a topic</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="sales">Sales & Pricing</option>
                    <option value="partnership">Partnership</option>
                    <option value="press">Press & Media</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="message">
                    Message
                  </label>
                  <textarea
                    id="message"
                    className={styles.textarea}
                    rows={5}
                    placeholder="Tell us how we can help..."
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  <Send size={15} />
                  Send Message
                </button>
              </form>
            </div>

            {/* Info Sidebar */}
            <div className={styles.infoSidebar}>
              <div className={styles.infoCards}>
                {contactInfo.map((item, i) => (
                  <div key={i} className={styles.infoCard}>
                    <div className={styles.infoIcon}>{item.icon}</div>
                    <div>
                      <span className={styles.infoLabel}>{item.label}</span>
                      {item.href ? (
                        <a href={item.href} className={styles.infoValue}>
                          {item.value}
                        </a>
                      ) : (
                        <span className={styles.infoValue}>{item.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.enterpriseCard}>
                <h3 className={styles.enterpriseTitle}>Enterprise inquiries</h3>
                <p className={styles.enterpriseDesc}>
                  Looking to deploy CardioGuard across your organization?
                  Contact our enterprise team for custom pricing, integration
                  support, and dedicated onboarding.
                </p>
                <a href="mailto:enterprise@cardioguard.ai" className={styles.enterpriseLink}>
                  enterprise@cardioguard.ai
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
