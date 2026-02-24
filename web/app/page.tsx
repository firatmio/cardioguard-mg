import dynamic from "next/dynamic";
import { Header } from "./components/Header/Header";
import { Hero } from "./components/Hero/Hero";
import { Stats } from "./components/Stats/Stats";
import { Footer } from "./components/Footer/Footer";

// Below-fold components — lazy loaded to reduce initial JS bundle
const Features = dynamic(
  () => import("./components/Features/Features").then((m) => m.Features),
  { ssr: true }
);
const AppShowcase = dynamic(
  () => import("./components/AppShowcase/AppShowcase").then((m) => m.AppShowcase),
  { ssr: true }
);
const HowItWorks = dynamic(
  () => import("./components/HowItWorks/HowItWorks").then((m) => m.HowItWorks),
  { ssr: true }
);
const Testimonials = dynamic(
  () => import("./components/Testimonials/Testimonials").then((m) => m.Testimonials),
  { ssr: true }
);
const CallToAction = dynamic(
  () => import("./components/CallToAction/CallToAction").then((m) => m.CallToAction),
  { ssr: true }
);

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Stats />
        <Features />
        <AppShowcase />
        <HowItWorks />
        <Testimonials />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
