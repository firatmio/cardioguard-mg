import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CardioGuard — AI-Powered Cardiac Monitoring",
  description:
    "Continuous ECG monitoring powered by MedGemma AI. Detect cardiac anomalies before they become emergencies. Trusted by healthcare professionals worldwide.",
  keywords: [
    "ECG monitoring",
    "cardiac health",
    "AI healthcare",
    "heart monitoring",
    "MedGemma",
    "wearable health",
  ],
  openGraph: {
    title: "CardioGuard — AI-Powered Cardiac Monitoring",
    description:
      "Continuous ECG monitoring powered by MedGemma AI. Detect cardiac anomalies before they become emergencies.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
