"use client";

import styles from "./Footer.module.css";
import Link from "next/link";
import { Heart, Github, Twitter, Linkedin } from "lucide-react";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Download", href: "/download" },
      { label: "API Docs", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "GDPR Compliance", href: "/privacy#gdpr" },
      { label: "HIPAA Notice", href: "/privacy#hipaa" },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              <div className={styles.logoIcon}>
                <Heart size={16} strokeWidth={2.5} />
              </div>
              <span>CardioGuard</span>
            </Link>
            <p className={styles.brandDesc}>
              AI-powered cardiac monitoring that detects anomalies before they
              become emergencies. Built on MedGemma clinical intelligence.
            </p>
            <div className={styles.socials}>
              <a href="#" className={styles.socialLink} aria-label="GitHub">
                <Github size={16} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">
                <Twitter size={16} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {footerLinks.map((group, i) => (
            <div key={i} className={styles.linkGroup}>
              <p className={styles.groupTitle}>{group.title}</p>
              <ul className={styles.links}>
                {group.links.map((link, j) => (
                  <li key={j}>
                    <Link href={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} CardioGuard. All rights reserved.
          </p>
          <p className={styles.regulatory}>
            CardioGuard is not a substitute for professional medical advice.
            Always consult your healthcare provider.
          </p>
        </div>
      </div>
    </footer>
  );
};
