import type { Metadata } from "next";
import Image from "next/image";
import { Header } from "../components/Header/Header";
import { Footer } from "../components/Footer/Footer";
import styles from "./page.module.css";
import {
  QrCode,
  Shield,
  Wifi,
  Activity,
  Star,
} from "lucide-react";
import { FaApple, FaGooglePlay } from "react-icons/fa6";

export const metadata: Metadata = {
  title: "Download — CardioGuard",
  description:
    "Download CardioGuard for iOS and Android. Start monitoring your heart health today.",
};

const requirements = [
  { label: "iOS", value: "iOS 15.0 or later" },
  { label: "Android", value: "Android 10 (API 29) or later" },
  { label: "BLE", value: "Bluetooth 4.2+ required" },
  { label: "Storage", value: "~85 MB free space" },
];

const highlights = [
  {
    icon: <Shield size={20} />,
    title: "Privacy by Default",
    desc: "All data stored locally with optional encrypted cloud sync.",
  },
  {
    icon: <Wifi size={20} />,
    title: "Works Offline",
    desc: "Full monitoring capability without internet connection.",
  },
  {
    icon: <Activity size={20} />,
    title: "Instant Setup",
    desc: "Pair your device and start recording in under 2 minutes.",
  },
];

export default function DownloadPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.badge}>Download</span>
            <h1 className={styles.heroTitle}>
              Get CardioGuard on
              <br />
              <span className="gradient">your device</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Available on iOS and Android. Free to download with no credit card
              required.
            </p>

            <div className={styles.storeButtons}>
              <a href="/path/to/appstore-link" className={styles.storeBtn}>
                <FaApple size={22} />
                <div className={styles.storeBtnText}>
                  <span className={styles.storeSmall}>Download on the</span>
                  <span className={styles.storeName}>App Store</span>
                </div>
              </a>
              <a href="/path/to/playstore-link" className={styles.storeBtn}>
                <FaGooglePlay size={22} />
                <div className={styles.storeBtnText}>
                  <span className={styles.storeSmall}>Get it on</span>
                  <span className={styles.storeName}>Google Play</span>
                </div>
              </a>
            </div>

            <div className={styles.rating}>
              <div className={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="var(--warning)" stroke="none" />
                ))}
              </div>
              <span className={styles.ratingText}>
                4.8 average — 2,400+ reviews
              </span>
            </div>
          </div>

          <div className={styles.heroPhone}>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneScreen}>
              <Image
                src="/in-app-screen.png"
                alt="CardioGuard app"
                width={540}
                height={1200}
                className={styles.phoneImg}
                priority
                sizes="(max-width: 768px) 180px, 220px"
                quality={80}
              />
            </div>
            </div>
          </div>
        </section>

        {/* QR Code */}
        {false && (
          <section className={styles.qrSection}>
            <div className={styles.qrCard}>
              <div className={styles.qrIcon}>
                <QrCode size={56} strokeWidth={1.2} />
              </div>
              <div className={styles.qrContent}>
                <h3 className={styles.qrTitle}>Scan to download</h3>
                <p className={styles.qrDesc}>
                  Point your phone camera at this QR code to open the download
                  page on your device.
                </p>
              </div>
              <div className={styles.qrPlaceholder}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/path/to/qr-code.png"
                  alt="QR code"
                  className={styles.qrImg}
                />
              </div>
            </div>
          </section>
        )}

        {/* Highlights */}
        <section className={styles.highlightsSection}>
          <div className={styles.highlightsGrid}>
            {highlights.map((h, i) => (
              <div key={i} className={styles.highlightCard}>
                <div className={styles.highlightIcon}>{h.icon}</div>
                <h4 className={styles.highlightTitle}>{h.title}</h4>
                <p className={styles.highlightDesc}>{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Screenshots */}
        <section className={styles.screenshotsSection}>
          <div className={styles.screenshotsInner}>
            <span className="sectionLabel">App Preview</span>
            <h2 className={styles.screenshotsTitle}>See it in action</h2>
            <div className={styles.screenshotsRow}>
              {[
                { src: "/in-app-screen.png", label: "Dashboard" },
                { src: "/in-app-screen-2.png", label: "ECG Monitor" },
                { src: "/in-app-screen-3.png", label: "History" },
                { src: "/in-app-screen-4.png", label: "Device" },
              ].map((ss, i) => (
                <div key={i} className={styles.ssPhone}>
                  <div className={styles.ssFrame}>
                    <div className={styles.ssNotch} />
                    <Image
                      src={ss.src}
                      alt={ss.label}
                      width={360}
                      height={800}
                      className={styles.ssImg}
                      loading="lazy"
                      sizes="(max-width: 768px) 30vw, 180px"
                      quality={70}
                    />
                  </div>
                  <span className={styles.ssLabel}>{ss.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className={styles.reqSection}>
          <div className={styles.reqInner}>
            <h3 className={styles.reqTitle}>System Requirements</h3>
            <div className={styles.reqGrid}>
              {requirements.map((r, i) => (
                <div key={i} className={styles.reqItem}>
                  <span className={styles.reqLabel}>{r.label}</span>
                  <span className={styles.reqValue}>{r.value}</span>
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
