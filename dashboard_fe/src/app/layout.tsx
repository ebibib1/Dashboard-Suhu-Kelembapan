import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "SensorHub - Monitor Suhu & Kelembapan",
  description: "Dashboard pemantauan real-time suhu dan kelembapan via sensor Modbus",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${outfit.variable} min-h-screen bg-bg-app`}>
        {/*
        THESIS: A friendly water-conservation dashboard aesthetic that turns raw IoT Modbus readings into delightful home environment indicators, refusing generic cold data-grid grids.
        OWN-WORLD: Soft light blue background, pure white cards with diffusion shadows, rounded-[2.5rem] containers, and a dark charcoal vertical navigation bar.
        STORY: The user monitors room temperature and humidity, visualized as interactive indicators and a dynamic mascot dialogue that speaks environmental statuses.
        FIRST VIEWPORT: Left sidebar navigation with custom SVG icons; main bento dashboard grid containing greetings card, dynamic droplet humidity card, vertical temperature slider, and right-hand personal assistant panel.
        FORM: Bento 2.0 water-themed dashboard, 1st option, seed key: 0d1f509f.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
        */}
        {children}
      </body>
    </html>
  );
}