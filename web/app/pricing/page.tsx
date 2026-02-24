import type { Metadata } from "next";
import { Header } from "../components/Header/Header";
import { Footer } from "../components/Footer/Footer";
import styles from "./page.module.css";
import { Check, Minus, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — CardioGuard",
  description:
    "Transparent pricing for individuals, clinics, and enterprises. Start monitoring for free.",
};

const plans = [
  {
    name: "Personal",
    price: "Free",
    period: "",
    description: "For individuals getting started with heart monitoring.",
    highlight: false,
    cta: "Get Started Free",
    features: [
      { text: "Basic ECG recording", included: true },
      { text: "Up to 50 recordings / month", included: true },
      { text: "MedGemma AI analysis", included: true },
      { text: "Offline-first storage", included: true },
      { text: "BLE device support", included: true },
      { text: "Push notifications", included: true },
      { text: "History & trends (30 days)", included: true },
      { text: "Priority support", included: false },
      { text: "Clinical report export", included: false },
      { text: "Multi-patient management", included: false },
      { text: "API access", included: false },
      { text: "Custom integrations", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "/ month",
    description: "Full monitoring power for patients and caregivers.",
    highlight: true,
    cta: "Start 14-Day Trial",
    features: [
      { text: "Continuous ECG recording", included: true },
      { text: "Unlimited recordings", included: true },
      { text: "MedGemma AI analysis", included: true },
      { text: "Offline-first storage", included: true },
      { text: "BLE device support", included: true },
      { text: "Smart notifications", included: true },
      { text: "Full history & trends", included: true },
      { text: "Priority support", included: true },
      { text: "Clinical report export (PDF)", included: true },
      { text: "Multi-patient management", included: false },
      { text: "API access", included: false },
      { text: "Custom integrations", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For clinics, hospitals, and healthcare organizations.",
    highlight: false,
    cta: "Talk to Sales",
    features: [
      { text: "Continuous ECG recording", included: true },
      { text: "Unlimited recordings", included: true },
      { text: "MedGemma AI analysis", included: true },
      { text: "Offline-first storage", included: true },
      { text: "Multi-device support", included: true },
      { text: "Configurable alert rules", included: true },
      { text: "Full history & trends", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Clinical report export", included: true },
      { text: "Multi-patient dashboard", included: true },
      { text: "REST API access", included: true },
      { text: "EHR / custom integrations", included: true },
    ],
  },
];

const faq = [
  {
    q: "Is the Personal plan really free?",
    a: "Yes. You can use CardioGuard at no cost with up to 50 ECG recordings per month. No credit card required.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Absolutely. Upgrade, downgrade, or cancel anytime from your account settings. Changes take effect at the next billing cycle.",
  },
  {
    q: "What devices are supported?",
    a: "CardioGuard works with any BLE-compatible ECG device following standard protocols. We maintain a list of tested devices in our documentation.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted in transit and at rest. We are HIPAA compliant and GDPR ready, with SOC 2 Type II certification in progress.",
  },
  {
    q: "Do you offer a discount for annual billing?",
    a: "Yes — annual Pro plans are billed at $99/year (save ~31%). Enterprise pricing is negotiated individually.",
  },
  {
    q: "Can I use CardioGuard without internet?",
    a: "Yes. Our offline-first architecture stores all data locally. Recordings and analyses sync automatically when connectivity returns.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.badge}>Pricing</span>
            <h1 className={styles.heroTitle}>
              Start for free,
              <br />
              <span className="gradient">scale with confidence</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Transparent plans for individuals, caregivers, and healthcare
              organizations. No hidden fees.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className={styles.plansSection}>
          <div className={styles.plansGrid}>
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`${styles.planCard} ${
                  plan.highlight ? styles.highlighted : ""
                }`}
              >
                {plan.highlight && (
                  <span className={styles.planBadge}>Most Popular</span>
                )}
                <div className={styles.planHeader}>
                  <h3 className={styles.planName}>{plan.name}</h3>
                  <div className={styles.planPrice}>
                    <span className={styles.priceValue}>{plan.price}</span>
                    {plan.period && (
                      <span className={styles.pricePeriod}>{plan.period}</span>
                    )}
                  </div>
                  <p className={styles.planDesc}>{plan.description}</p>
                </div>
                <ul className={styles.featureList}>
                  {plan.features.map((f, fi) => (
                    <li
                      key={fi}
                      className={`${styles.featureItem} ${
                        !f.included ? styles.notIncluded : ""
                      }`}
                    >
                      {f.included ? (
                        <Check size={15} className={styles.checkIcon} />
                      ) : (
                        <Minus size={15} className={styles.minusIcon} />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.name === "Enterprise" ? "/contact" : "/login"}
                  className={`${styles.planCta} ${
                    plan.highlight ? styles.ctaPrimary : ""
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={15} />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.faqSection}>
          <div className={styles.faqInner}>
            <span className="sectionLabel">FAQ</span>
            <h2 className={styles.faqTitle}>Frequently asked questions</h2>
            <div className={styles.faqGrid}>
              {faq.map((item, i) => (
                <div key={i} className={styles.faqCard}>
                  <h4 className={styles.faqQ}>{item.q}</h4>
                  <p className={styles.faqA}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
